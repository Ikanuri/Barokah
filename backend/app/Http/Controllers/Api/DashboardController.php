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
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        $todayTransactions = Transaction::where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $todayRevenue = Transaction::where('status', 'completed')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->sum('total');

        $todayProfit = DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [$todayStart, $todayEnd])
            ->select(
                DB::raw('SUM(transaction_items.subtotal - (products.base_price * transaction_items.base_quantity)) as profit')
            )
            ->value('profit') ?? 0;

        $totalProducts = Product::where('is_active', true)->count();

        $lowStockProducts = Product::where('is_active', true)
            ->whereColumn('stock_quantity', '<=', 'minimum_stock')
            ->count();

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
                    'daily' => $this->getTopGainers($todayStart, $todayEnd),
                    'weekly' => $this->getTopGainers(now()->startOfWeek(), now()->endOfWeek()),
                    'monthly' => $this->getTopGainers(now()->startOfMonth(), now()->endOfMonth()),
                ],
            ],
        ]);
    }

    /**
     * Laporan Laba Rugi dengan filter tanggal
     */
    public function profitLoss(Request $request)
    {
        try {
            $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
            $endDate   = $request->input('end_date', now()->toDateString());

            $start = \Carbon\Carbon::parse($startDate)->startOfDay();
            $end   = \Carbon\Carbon::parse($endDate)->endOfDay();

            // Total pendapatan (omzet)
            $revenue = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('total');

            // HPP & Laba Kotor
            $cogs = DB::table('transaction_items')
                ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                ->join('products', 'transaction_items.product_id', '=', 'products.id')
                ->where('transactions.status', 'completed')
                ->whereBetween('transactions.created_at', [$start, $end])
                ->sum(DB::raw('products.base_price * transaction_items.base_quantity'));

            $grossProfit  = $revenue - $cogs;
            $grossMargin  = $revenue > 0 ? round(($grossProfit / $revenue) * 100, 2) : 0;

            // Total diskon yang diberikan
            $totalDiscount = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->sum('discount');

            // Jumlah transaksi
            $totalTransactions = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->count();

            // Breakdown per metode pembayaran
            $byPaymentMethod = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
                ->groupBy('payment_method')
                ->get();

            // Top produk paling menguntungkan di periode ini
            $topProfitable = $this->getTopGainers($start, $end, 10);

            // Rekap harian
            $daily = DB::table('transactions')
                ->where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->select(
                    DB::raw('DATE(created_at) as date'),
                    DB::raw('COUNT(*) as transactions'),
                    DB::raw('SUM(total) as revenue'),
                    DB::raw('SUM(discount) as discount')
                )
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            return response()->json([
                'message' => 'OK',
                'data' => [
                    'period'             => ['start' => $startDate, 'end' => $endDate],
                    'revenue'            => (float) $revenue,
                    'cogs'               => (float) $cogs,
                    'gross_profit'       => (float) $grossProfit,
                    'gross_margin'       => $grossMargin,
                    'total_discount'     => (float) $totalDiscount,
                    'total_transactions' => (int) $totalTransactions,
                    'by_payment_method'  => $byPaymentMethod,
                    'top_profitable'     => $topProfitable,
                    'daily'              => $daily,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil laporan laba rugi', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Rekap Shift: ringkasan penjualan kasir hari ini atau periode tertentu
     */
    public function shiftRecap(Request $request)
    {
        try {
            $date      = $request->input('date', now()->toDateString());
            $userId    = $request->input('user_id'); // null = semua kasir

            $start = \Carbon\Carbon::parse($date)->startOfDay();
            $end   = \Carbon\Carbon::parse($date)->endOfDay();

            $query = Transaction::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end]);

            if ($userId) {
                $query->where('user_id', $userId);
            }

            $transactions = $query->with(['user', 'items.product'])->get();

            $totalRevenue    = $transactions->sum('total');
            $totalDiscount   = $transactions->sum('discount');
            $totalTransactions = $transactions->count();

            // Breakdown per metode bayar
            $byPaymentMethod = $transactions->groupBy('payment_method')->map(fn($group) => [
                'count' => $group->count(),
                'total' => $group->sum('total'),
            ]);

            // Item terlaris hari ini
            $itemSales = [];
            foreach ($transactions as $trx) {
                foreach ($trx->items as $item) {
                    $pid = $item->product_id;
                    if (!isset($itemSales[$pid])) {
                        $itemSales[$pid] = ['name' => $item->product->name ?? '-', 'qty' => 0, 'total' => 0];
                    }
                    $itemSales[$pid]['qty']   += $item->quantity;
                    $itemSales[$pid]['total'] += $item->subtotal;
                }
            }
            usort($itemSales, fn($a, $b) => $b['qty'] - $a['qty']);

            return response()->json([
                'message' => 'OK',
                'data' => [
                    'date'              => $date,
                    'total_transactions' => $totalTransactions,
                    'total_revenue'     => (float) $totalRevenue,
                    'total_discount'    => (float) $totalDiscount,
                    'by_payment_method' => $byPaymentMethod,
                    'top_items'         => array_slice(array_values($itemSales), 0, 10),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil rekap shift', 'error' => $e->getMessage()], 500);
        }
    }

    private function getTopGainers($startDate, $endDate, int $limit = 5)
    {
        return DB::table('transaction_items')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->where('transactions.status', 'completed')
            ->whereBetween('transactions.created_at', [$startDate, $endDate])
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
            ->limit($limit)
            ->get();
    }
}
