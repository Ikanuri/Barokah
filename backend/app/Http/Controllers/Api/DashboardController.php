<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats(Request $request)
    {
        // Get today's date range
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        // Today's transactions count
        $todayTransactions = Transaction::where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        // Today's revenue
        $todayRevenue = Transaction::where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('total');

        // Today's profit (revenue - cost)
        $todayProfit = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [$todayStart, $todayEnd])
            ->select(
                DB::raw('SUM(transaction_items.subtotal - (products.base_price * transaction_items.base_quantity)) as profit')
            )
            ->value('profit') ?? 0;

        // Total active products
        $totalProducts = Product::where('is_active', true)->count();

        // Low stock products (stock <= minimum_stock)
        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'minimum_stock')
            ->count();

        // Last 7 days revenue
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $revenue = Transaction::where('status', 'completed')
                ->whereDate('created_at', $date)
                ->sum('total');
            
            $last7Days[] = [
                'date' => $date,
                'revenue' => (float) $revenue,
            ];
        }

        // Top selling products (last 30 days)
        $topProducts = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->subDays(30), now()])
            ->select(
                'products.id',
                'products.name',
                DB::raw('SUM(transaction_items.quantity) as total_sold'),
                DB::raw('SUM(transaction_items.subtotal) as total_revenue')
            )
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get();

        // Top gainers (highest profit margin products)
        $topGainersDaily = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [$todayStart, $todayEnd])
            ->select(
                'products.id',
                'products.name',
                'products.sku',
                DB::raw('SUM(transaction_items.quantity) as total_sold'),
                DB::raw('SUM(transaction_items.subtotal - (products.base_price * transaction_items.base_quantity)) as profit'),
                DB::raw('SUM(transaction_items.subtotal) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('profit')
            ->limit(5)
            ->get();

        $topGainersWeekly = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->select(
                'products.id',
                'products.name',
                'products.sku',
                DB::raw('SUM(transaction_items.quantity) as total_sold'),
                DB::raw('SUM(transaction_items.subtotal - (products.base_price * transaction_items.base_quantity)) as profit'),
                DB::raw('SUM(transaction_items.subtotal) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('profit')
            ->limit(5)
            ->get();

        $topGainersMonthly = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [now()->startOfMonth(), now()->endOfMonth()])
            ->select(
                'products.id',
                'products.name',
                'products.sku',
                DB::raw('SUM(transaction_items.quantity) as total_sold'),
                DB::raw('SUM(transaction_items.subtotal - (products.base_price * transaction_items.base_quantity)) as profit'),
                DB::raw('SUM(transaction_items.subtotal) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('profit')
            ->limit(5)
            ->get();

        return response()->json([
            'data' => [
                'today_transactions' => $todayTransactions,
                'today_revenue' => (float) $todayRevenue,
                'today_profit' => (float) $todayProfit,
                'total_products' => $totalProducts,
                'low_stock_products' => $lowStockProducts,
                'last_7_days' => $last7Days,
                'top_products' => $topProducts,
                'top_gainers' => [
                    'daily' => $topGainersDaily,
                    'weekly' => $topGainersWeekly,
                    'monthly' => $topGainersMonthly,
                ],
            ],
        ]);
    }
}
