<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class StoreController extends Controller
{
    /**
     * Get all stores
     */
    public function index()
    {
        $stores = Store::withCount(['products', 'transactions', 'users'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($stores);
    }

    /**
     * Get active stores only
     */
    public function active()
    {
        $stores = Store::active()
            ->select('id', 'code', 'name', 'address', 'phone')
            ->orderBy('name')
            ->get();

        return response()->json($stores);
    }

    /**
     * Get current store details
     */
    public function current(Request $request)
    {
        $storeId = $request->header('X-Store-ID') ?? $request->input('store_id');
        
        if (!$storeId) {
            // Return first active store as default
            $store = Store::active()->first();
        } else {
            $store = Store::find($storeId);
        }

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $store->loadCount(['products', 'transactions', 'users']);

        return response()->json($store);
    }

    /**
     * Create new store
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code' => 'required|string|unique:stores,code|max:20',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $store = Store::create($request->all());

        return response()->json([
            'message' => 'Store created successfully',
            'store' => $store
        ], 201);
    }

    /**
     * Update store
     */
    public function update(Request $request, $id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'code' => 'nullable|string|unique:stores,code,' . $id . '|max:20',
            'name' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
            'settings' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $store->update($request->all());

        return response()->json([
            'message' => 'Store updated successfully',
            'store' => $store
        ]);
    }

    /**
     * Delete store (soft delete - set is_active to false)
     */
    public function destroy($id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        // Check if store has data
        $hasProducts = $store->products()->count() > 0;
        $hasTransactions = $store->transactions()->count() > 0;

        if ($hasProducts || $hasTransactions) {
            // Soft delete - just deactivate
            $store->update(['is_active' => false]);
            return response()->json([
                'message' => 'Store deactivated successfully (has existing data)'
            ]);
        }

        // Hard delete if no data
        $store->delete();

        return response()->json(['message' => 'Store deleted successfully']);
    }

    /**
     * Sync prices from one store to another
     * 
     * Options:
     * - Sync by category
     * - Sync specific products
     * - Sync all products
     */
    public function syncPrices(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'source_store_id' => 'required|exists:stores,id',
            'target_store_ids' => 'required|array',
            'target_store_ids.*' => 'exists:stores,id',
            'sync_type' => 'required|in:all,category,products',
            'category_id' => 'required_if:sync_type,category|exists:categories,id',
            'product_ids' => 'required_if:sync_type,products|array',
            'product_ids.*' => 'exists:products,id',
            'fields' => 'nullable|array', // Fields to sync: selling_price, base_price, etc.
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $sourceStoreId = $request->source_store_id;
        $targetStoreIds = $request->target_store_ids;
        $syncType = $request->sync_type;
        $fields = $request->fields ?? ['selling_price', 'base_price'];

        DB::beginTransaction();
        try {
            // Get source products
            $sourceQuery = Product::where('store_id', $sourceStoreId);

            if ($syncType === 'category') {
                $sourceQuery->where('category_id', $request->category_id);
            } elseif ($syncType === 'products') {
                $sourceQuery->whereIn('id', $request->product_ids);
            }

            $sourceProducts = $sourceQuery->get();
            $synced = 0;
            $created = 0;
            $skipped = 0;

            foreach ($targetStoreIds as $targetStoreId) {
                foreach ($sourceProducts as $sourceProduct) {
                    // Find matching product in target store (by SKU or barcode)
                    $targetProduct = Product::where('store_id', $targetStoreId)
                        ->where(function ($query) use ($sourceProduct) {
                            $query->where('sku', $sourceProduct->sku)
                                  ->orWhere('barcode', $sourceProduct->barcode);
                        })
                        ->first();

                    if ($targetProduct) {
                        // Update existing product prices
                        $updateData = [];
                        foreach ($fields as $field) {
                            if (isset($sourceProduct->$field)) {
                                $updateData[$field] = $sourceProduct->$field;
                            }
                        }
                        $targetProduct->update($updateData);
                        $synced++;
                    } else {
                        // Create new product in target store
                        $newProduct = $sourceProduct->replicate();
                        $newProduct->store_id = $targetStoreId;
                        $newProduct->stock_quantity = 0; // Reset stock
                        $newProduct->save();
                        $created++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Prices synced successfully',
                'stats' => [
                    'source_store_id' => $sourceStoreId,
                    'target_stores' => count($targetStoreIds),
                    'synced' => $synced,
                    'created' => $created,
                    'skipped' => $skipped,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to sync prices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get store statistics
     */
    public function stats($id)
    {
        $store = Store::find($id);

        if (!$store) {
            return response()->json(['message' => 'Store not found'], 404);
        }

        $stats = [
            'store' => $store,
            'total_products' => $store->products()->count(),
            'active_products' => $store->products()->where('is_active', true)->count(),
            'low_stock_products' => $store->products()
                ->whereRaw('stock_quantity <= minimum_stock')
                ->count(),
            'total_transactions' => $store->transactions()->count(),
            'today_transactions' => $store->transactions()
                ->whereDate('created_at', today())
                ->count(),
            'today_revenue' => $store->transactions()
                ->whereDate('created_at', today())
                ->where('payment_status', 'paid')
                ->sum('total'),
            'total_users' => $store->users()->count(),
            'active_users' => $store->users()->where('is_active', true)->count(),
        ];

        return response()->json($stats);
    }
}
