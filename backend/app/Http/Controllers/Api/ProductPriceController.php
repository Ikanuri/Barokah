<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductPrice;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductPriceController extends Controller
{
    /**
     * Get all prices for a product
     */
    public function index($productId)
    {
        $product = Product::findOrFail($productId);
        $prices = $product->prices()->orderBy('priority', 'desc')->get();
        
        return response()->json($prices);
    }

    /**
     * Store new price for product
     */
    public function store(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);

        $validated = $request->validate([
            'price_type' => 'required|string|max:50',
            'price_name' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
            'min_quantity' => 'required|integer|min:1',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0',
            'description' => 'nullable|string',
        ]);

        $price = $product->prices()->create($validated);

        return response()->json([
            'message' => 'Price created successfully',
            'data' => $price
        ], 201);
    }

    /**
     * Update price
     */
    public function update(Request $request, $productId, $priceId)
    {
        $product = Product::findOrFail($productId);
        $price = $product->prices()->findOrFail($priceId);

        $validated = $request->validate([
            'price_type' => 'string|max:50',
            'price_name' => 'string|max:100',
            'price' => 'numeric|min:0',
            'min_quantity' => 'integer|min:1',
            'is_active' => 'boolean',
            'priority' => 'integer|min:0',
            'description' => 'nullable|string',
        ]);

        $price->update($validated);

        return response()->json([
            'message' => 'Price updated successfully',
            'data' => $price
        ]);
    }

    /**
     * Delete price
     */
    public function destroy($productId, $priceId)
    {
        $product = Product::findOrFail($productId);
        $price = $product->prices()->findOrFail($priceId);

        $price->delete();

        return response()->json([
            'message' => 'Price deleted successfully'
        ]);
    }

    /**
     * Get best price for given quantity
     */
    public function getBestPrice(Request $request, $productId)
    {
        $quantity = $request->get('quantity', 1);
        
        $bestPrice = ProductPrice::getBestPrice($productId, $quantity);

        if (!$bestPrice) {
            return response()->json([
                'message' => 'No available price for this product'
            ], 404);
        }

        return response()->json($bestPrice);
    }
}
