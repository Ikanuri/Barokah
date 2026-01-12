<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductUnit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        // Optimized query - select only needed columns untuk list view
        $query = Product::query();
        
        // DISABLE CACHE for now to ensure fresh data after updates
        // TODO: Implement cache tagging or better invalidation strategy
        $perPage = $request->get('per_page', 15);
        $useCache = false; // Temporarily disabled
        
        if ($useCache) {
            // Cache selama 5 menit untuk bulk load
            $cacheKey = 'products_all_' . md5($request->get('search', ''));
            
            $products = \Cache::remember($cacheKey, 300, function () use ($request) {
                $query = Product::with(['category:id,name', 'units:id,product_id,unit_name,conversion_value,unit_type']);
                
                // Search
                if ($request->has('search')) {
                    $search = $request->search;
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%")
                            ->orWhere('barcode', 'like', "%{$search}%");
                    });
                }
                
                // Filter by category
                if ($request->has('category_id')) {
                    $query->where('category_id', $request->category_id);
                }
                
                return $query->latest()->get();
            });
            
            return response()->json(['data' => $products]);
        }

        // Normal pagination untuk request kecil
        $query->with(['category', 'units', 'prices' => function($q) {
            $q->active()->orderBy('priority', 'desc');
        }]);

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Filter by stock status
        if ($request->has('stock_status')) {
            if ($request->stock_status === 'low_stock') {
                $query->whereRaw('stock_quantity <= minimum_stock');
            } elseif ($request->stock_status === 'out_of_stock') {
                $query->where('stock_quantity', '<=', 0);
            }
        }

        // Filter active only
        if ($request->has('active_only') && $request->active_only) {
            $query->where('is_active', true);
        }

        $products = $query->latest()->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'sku' => 'required|string|unique:products,sku',
            'barcode' => 'nullable|string|unique:products,barcode',
            'category_id' => 'nullable|exists:categories,id', // Changed to nullable
            'description' => 'nullable|string',
            'base_price' => 'nullable|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'base_unit' => 'required|string|max:50',
            'stock_quantity' => 'required|integer|min:0',
            'minimum_stock' => 'required|integer|min:0',
            'image' => 'nullable|image|max:2048',
            'is_active' => 'boolean',
            'units' => 'nullable|array',
            'units.*.unit_name' => 'required|string',
            'units.*.unit_type' => 'nullable|string|in:countable,weight',
            'units.*.conversion_value' => 'required|numeric|min:0.001',
            'units.*.selling_price' => 'nullable|numeric|min:0',
            'units.*.barcode' => 'nullable|string|unique:product_units,barcode',
            'units.*.order' => 'nullable|integer|min:0', // Changed to nullable
            'variants' => 'nullable|array',
            'variants.*.name' => 'required_with:variants|string',
            'variants.*.sku_suffix' => 'nullable|string',
            'variants.*.barcode' => 'nullable|string',
            'variants.*.price_adjustment' => 'nullable|numeric',
            'prices' => 'nullable|array',
            'prices.*.price_type' => 'required_with:prices|string|in:normal,bronze,silver,gold,platinum,wholesale,super_wholesale,retail',
            'prices.*.price_name' => 'required_with:prices|string',
            'prices.*.price' => 'required_with:prices|numeric|min:0',
            'prices.*.min_quantity' => 'nullable|integer|min:1',
            'prices.*.is_active' => 'nullable|boolean',
            'prices.*.priority' => 'nullable|integer|min:0',
            'prices.*.description' => 'nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($validated);

        // Create product units
        if ($request->has('units') && is_array($request->units)) {
            foreach ($request->units as $index => $unitData) {
                // Set default order if not provided
                if (!isset($unitData['order'])) {
                    $unitData['order'] = $index + 1;
                }
                $product->units()->create($unitData);
            }
        }

        // Create product prices
        if ($request->has('prices') && is_array($request->prices)) {
            foreach ($request->prices as $index => $priceData) {
                // Set defaults
                $priceData['is_active'] = $priceData['is_active'] ?? true;
                $priceData['min_quantity'] = $priceData['min_quantity'] ?? 1;
                $priceData['priority'] = $priceData['priority'] ?? ($index + 1);
                
                $product->prices()->create($priceData);
            }
        }

        // Clear product cache setelah create
        \Cache::flush(); // Clear all cache
        // Also clear specific product cache tags if using tags
        \Cache::forget('products_all_'); // Clear base cache
        
        \Log::info('Product created and cache cleared', ['product_id' => $product->id]);

        return response()->json([
            'message' => 'Product created successfully',
            'data' => $product->load(['category', 'units', 'prices']),
        ], 201);
    }

    public function show($id)
    {
        $product = Product::with(['category', 'units', 'prices' => function($q) {
            $q->active()->orderBy('priority', 'desc');
        }])->findOrFail($id);
        return response()->json($product);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        
        // Log request untuk debugging
        \Log::info('Product Update Request', [
            'product_id' => $id,
            'request_data' => $request->all(),
            'has_base_price' => $request->has('base_price'),
            'base_price_value' => $request->get('base_price')
        ]);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'sku' => 'sometimes|required|string|unique:products,sku,' . $id,
            'barcode' => 'sometimes|nullable|string|unique:products,barcode,' . $id,
            'category_id' => 'sometimes|nullable|exists:categories,id', // Changed to nullable
            'description' => 'sometimes|nullable|string',
            'base_price' => 'sometimes|nullable|numeric|min:0',
            'selling_price' => 'sometimes|required|numeric|min:0',
            'base_unit' => 'sometimes|required|string|max:50',
            'stock_quantity' => 'sometimes|required|integer|min:0',
            'minimum_stock' => 'sometimes|required|integer|min:0',
            'image' => 'nullable|image|max:2048',
            'is_active' => 'sometimes|boolean',
            'units' => 'nullable|array',
            'units.*.id' => 'nullable|exists:product_units,id',
            'units.*.unit_name' => 'required_with:units|string',
            'units.*.unit_type' => 'nullable|string|in:countable,weight',
            'units.*.conversion_value' => 'required_with:units|numeric|min:0.001',
            'units.*.selling_price' => 'nullable|numeric|min:0',
            'units.*.barcode' => 'nullable|string',
            'units.*.order' => 'nullable|integer|min:0', // Changed to nullable
            'variants' => 'nullable|array',
            'variants.*.name' => 'required_with:variants|string',
            'variants.*.sku_suffix' => 'nullable|string',
            'variants.*.barcode' => 'nullable|string',
            'variants.*.price_adjustment' => 'nullable|numeric',
            'prices' => 'nullable|array',
            'prices.*.id' => 'nullable|exists:product_prices,id',
            'prices.*.price_type' => 'required_with:prices|string|in:normal,bronze,silver,gold,platinum,wholesale,super_wholesale,retail',
            'prices.*.price_name' => 'required_with:prices|string',
            'prices.*.price' => 'required_with:prices|numeric|min:0',
            'prices.*.min_quantity' => 'nullable|integer|min:1',
            'prices.*.is_active' => 'nullable|boolean',
            'prices.*.priority' => 'nullable|integer|min:0',
            'prices.*.description' => 'nullable|string',
        ]);

        // Handle image upload
        if ($request->hasFile('image')) {
            // Delete old image
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $validated['image'] = $request->file('image')->store('products', 'public');
        }

        // Filter hanya field product (exclude units)
        $productData = collect($validated)->except('units')->toArray();
        
        // Log data yang akan di-update
        \Log::info('Updating product with data', [
            'product_id' => $id,
            'update_data' => $productData,
            'validated_keys' => array_keys($validated),
            'product_data_keys' => array_keys($productData)
        ]);
        
        // Update product
        $product->update($productData);
        
        // Log hasil update
        \Log::info('Product after update', [
            'product_id' => $id,
            'updated_product' => $product->toArray()
        ]);

        // Sync product units
        if ($request->has('units') && is_array($request->units)) {
            // Get existing unit IDs
            $existingUnitIds = $product->units->pluck('id')->toArray();
            $incomingUnitIds = [];

            foreach ($request->units as $index => $unitData) {
                // Set default order if not provided
                if (!isset($unitData['order'])) {
                    $unitData['order'] = $index + 1;
                }
                
                // Validate barcode uniqueness (allow same barcode for same unit)
                if (!empty($unitData['barcode'])) {
                    $barcodeExists = \App\Models\ProductUnit::where('barcode', $unitData['barcode'])
                        ->when(isset($unitData['id']), function ($q) use ($unitData) {
                            return $q->where('id', '!=', $unitData['id']);
                        })
                        ->exists();
                    
                    if ($barcodeExists) {
                        return response()->json([
                            'message' => 'Barcode unit "' . $unitData['barcode'] . '" sudah digunakan',
                            'errors' => ['barcode' => ['Barcode sudah digunakan oleh unit lain']]
                        ], 422);
                    }
                }

                if (isset($unitData['id']) && in_array($unitData['id'], $existingUnitIds)) {
                    // Update existing unit
                    $unit = $product->units()->find($unitData['id']);
                    if ($unit) {
                        $unit->update($unitData);
                        $incomingUnitIds[] = $unitData['id'];
                    }
                } else {
                    // Create new unit
                    $newUnit = $product->units()->create($unitData);
                    $incomingUnitIds[] = $newUnit->id;
                }
            }

            // Delete units that are not in the incoming data
            $unitsToDelete = array_diff($existingUnitIds, $incomingUnitIds);
            if (!empty($unitsToDelete)) {
                $product->units()->whereIn('id', $unitsToDelete)->delete();
            }
        } elseif ($request->has('units') && empty($request->units)) {
            // If units is explicitly empty array, delete all units
            $product->units()->delete();
        }

        // Sync product prices
        if ($request->has('prices') && is_array($request->prices)) {
            // Get existing price IDs
            $existingPriceIds = $product->prices->pluck('id')->toArray();
            $incomingPriceIds = [];

            foreach ($request->prices as $index => $priceData) {
                // Set defaults
                $priceData['is_active'] = $priceData['is_active'] ?? true;
                $priceData['min_quantity'] = $priceData['min_quantity'] ?? 1;
                $priceData['priority'] = $priceData['priority'] ?? ($index + 1);

                if (isset($priceData['id']) && in_array($priceData['id'], $existingPriceIds)) {
                    // Update existing price
                    $price = $product->prices()->find($priceData['id']);
                    if ($price) {
                        $price->update($priceData);
                        $incomingPriceIds[] = $priceData['id'];
                    }
                } else {
                    // Create new price
                    $newPrice = $product->prices()->create($priceData);
                    $incomingPriceIds[] = $newPrice->id;
                }
            }

            // Delete prices that are not in the incoming data
            $pricesToDelete = array_diff($existingPriceIds, $incomingPriceIds);
            if (!empty($pricesToDelete)) {
                $product->prices()->whereIn('id', $pricesToDelete)->delete();
            }
        } elseif ($request->has('prices') && empty($request->prices)) {
            // If prices is explicitly empty array, delete all prices
            $product->prices()->delete();
        }

        // Clear product cache setelah update
        \Cache::flush();
        
        \Log::info('Product update completed', ['product_id' => $id]);

        // Reload product completely from database dengan query fresh
        $updatedProduct = Product::with(['category', 'units', 'prices'])->findOrFail($id);
        
        \Log::info('Sending updated product response', [
            'product_id' => $id,
            'product_name' => $updatedProduct->name,
            'updated_at' => $updatedProduct->updated_at
        ]);

        return response()->json([
            'message' => 'Product updated successfully',
            'data' => $updatedProduct,
        ]);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);

        // Delete image
        if ($product->image) {
            Storage::disk('public')->delete($product->image);
        }

        $product->delete();

        // Clear product cache setelah delete
        \Cache::flush();

        return response()->json([
            'message' => 'Product deleted successfully',
        ]);
    }

    // Search products with smart query (untuk fitur adaptive search)
    public function smartSearch(Request $request)
    {
        $query = $request->get('q', '');
        
        // First, check if query matches a variant barcode exactly
        $productsWithVariants = Product::with(['category', 'units'])
            ->where('is_active', true)
            ->whereNotNull('variants')
            ->get();
        
        foreach ($productsWithVariants as $product) {
            if ($product->variants) {
                foreach ($product->variants as $index => $variant) {
                    if (isset($variant['barcode']) && 
                        strtolower($variant['barcode']) === strtolower($query)) {
                        // Variant barcode match! Return product with matched variant info
                        $product->matched_variant = $variant;
                        $product->matched_variant_index = $index;
                        return response()->json([$product]);
                    }
                }
            }
        }
        
        // Parse query: "sedap goreng 5 biji" -> product: "sedap goreng", qty: 5, unit: "biji"
        $products = Product::with(['category', 'units'])
            ->where('is_active', true)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('sku', 'like', "%{$query}%")
                    ->orWhere('barcode', 'like', "%{$query}%");
            })
            ->orWhereHas('units', function ($q) use ($query) {
                $q->where('barcode', 'like', "%{$query}%");
            })
            ->limit(10)
            ->get();

        return response()->json($products);
    }

    // Search by barcode
    public function searchByBarcode(Request $request)
    {
        $barcode = $request->get('barcode');

        // Search in products
        $product = Product::where('barcode', $barcode)
            ->where('is_active', true)
            ->with(['category', 'units'])
            ->first();

        if ($product) {
            return response()->json([
                'product' => $product,
                'unit' => null,
            ]);
        }

        // Search in product units
        $productUnit = ProductUnit::where('barcode', $barcode)
            ->with(['product.category', 'product.units'])
            ->first();

        if ($productUnit) {
            return response()->json([
                'product' => $productUnit->product,
                'unit' => $productUnit,
            ]);
        }

        return response()->json([
            'message' => 'Product not found',
        ], 404);
    }
}
