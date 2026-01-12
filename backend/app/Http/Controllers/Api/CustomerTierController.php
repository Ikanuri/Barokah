<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerTier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CustomerTierController extends Controller
{
    /**
     * Display a listing of customer tiers
     */
    public function index()
    {
        $tiers = CustomerTier::with(['customers' => function($query) {
            $query->select('id', 'tier_id');
        }])
        ->withCount('customers')
        ->ordered()
        ->get();

        return response()->json([
            'success' => true,
            'data' => $tiers,
        ]);
    }

    /**
     * Store a newly created tier
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'discount_percentage' => 'required|numeric|min:0|max:100',
            'minimum_purchase' => 'required|numeric|min:0',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'order' => 'required|integer|min:1',
        ]);

        $validated['slug'] = Str::slug($validated['name']);

        $tier = CustomerTier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tier berhasil dibuat',
            'data' => $tier,
        ], 201);
    }

    /**
     * Display the specified tier
     */
    public function show($id)
    {
        $tier = CustomerTier::with('customers')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $tier,
        ]);
    }

    /**
     * Update the specified tier
     */
    public function update(Request $request, $id)
    {
        $tier = CustomerTier::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'discount_percentage' => 'sometimes|numeric|min:0|max:100',
            'minimum_purchase' => 'sometimes|numeric|min:0',
            'color' => 'nullable|string|max:7',
            'icon' => 'nullable|string|max:10',
            'description' => 'nullable|string',
            'order' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $tier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Tier berhasil diupdate',
            'data' => $tier,
        ]);
    }

    /**
     * Remove the specified tier
     */
    public function destroy($id)
    {
        $tier = CustomerTier::findOrFail($id);
        
        // Check if tier has customers
        if ($tier->customers()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak dapat menghapus tier yang masih memiliki pelanggan',
            ], 400);
        }

        $tier->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tier berhasil dihapus',
        ]);
    }

    /**
     * Get tier statistics
     */
    public function statistics()
    {
        $tiers = CustomerTier::withCount('customers')
            ->ordered()
            ->get()
            ->map(function ($tier) {
                return [
                    'id' => $tier->id,
                    'name' => $tier->name,
                    'icon' => $tier->icon,
                    'color' => $tier->color,
                    'customers_count' => $tier->customers_count,
                    'discount_percentage' => $tier->discount_percentage,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $tiers,
        ]);
    }
}
