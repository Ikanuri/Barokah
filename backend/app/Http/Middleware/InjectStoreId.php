<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InjectStoreId
{
    /**
     * Handle an incoming request.
     *
     * Automatically inject store_id from header or user's default store
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Get store_id from header
        $storeId = $request->header('X-Store-ID');

        // If not in header, try to get from authenticated user
        if (!$storeId && $request->user()) {
            $storeId = $request->user()->store_id;
        }

        // If still no store_id, get first active store
        if (!$storeId) {
            $defaultStore = \App\Models\Store::active()->first();
            $storeId = $defaultStore?->id;
        }

        // Inject store_id into request
        if ($storeId) {
            $request->merge(['current_store_id' => $storeId]);
            $request->attributes->set('store_id', $storeId);
        }

        return $next($request);
    }
}
