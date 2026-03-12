<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Expense::with('user')->orderByDesc('expense_date')->orderByDesc('id');

            if ($request->filled('start_date')) {
                $query->where('expense_date', '>=', $request->start_date);
            }
            if ($request->filled('end_date')) {
                $query->where('expense_date', '<=', $request->end_date);
            }
            if ($request->filled('category')) {
                $query->where('category', $request->category);
            }

            $expenses = $query->get();

            return response()->json(['message' => 'OK', 'data' => $expenses]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil data pengeluaran', 'error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'category'     => 'required|string|in:operasional,pembelian_stok,gaji,sewa,utilitas,lainnya',
                'description'  => 'required|string|max:255',
                'amount'       => 'required|numeric|min:1',
                'expense_date' => 'required|date',
                'notes'        => 'nullable|string|max:500',
            ]);

            $validated['user_id'] = $request->user()->id;

            $expense = Expense::create($validated);
            $expense->load('user');

            return response()->json(['message' => 'Pengeluaran berhasil ditambahkan', 'data' => $expense], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menyimpan pengeluaran', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $expense = Expense::findOrFail($id);

            $validated = $request->validate([
                'category'     => 'required|string|in:operasional,pembelian_stok,gaji,sewa,utilitas,lainnya',
                'description'  => 'required|string|max:255',
                'amount'       => 'required|numeric|min:1',
                'expense_date' => 'required|date',
                'notes'        => 'nullable|string|max:500',
            ]);

            $expense->update($validated);
            $expense->load('user');

            return response()->json(['message' => 'Pengeluaran berhasil diperbarui', 'data' => $expense]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal memperbarui pengeluaran', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $expense = Expense::findOrFail($id);
            $expense->delete();

            return response()->json(['message' => 'Pengeluaran berhasil dihapus']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal menghapus pengeluaran', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cash flow summary: pemasukan dari transaksi + pengeluaran
     */
    public function summary(Request $request)
    {
        try {
            $startDate = $request->input('start_date', now()->startOfMonth()->toDateString());
            $endDate   = $request->input('end_date', now()->toDateString());

            // Pemasukan dari transaksi yang sudah dibayar
            $income = Transaction::where('payment_status', 'paid')
                ->whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate)
                ->sum('total');

            // Total pengeluaran
            $totalExpenses = Expense::whereBetween('expense_date', [$startDate, $endDate])->sum('amount');

            // Pengeluaran per kategori
            $expensesByCategory = Expense::whereBetween('expense_date', [$startDate, $endDate])
                ->select('category', DB::raw('SUM(amount) as total'))
                ->groupBy('category')
                ->get()
                ->keyBy('category');

            // Pemasukan harian (untuk grafik)
            $dailyIncome = Transaction::where('payment_status', 'paid')
                ->whereDate('created_at', '>=', $startDate)
                ->whereDate('created_at', '<=', $endDate)
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total) as income'), DB::raw('COUNT(*) as transactions'))
                ->groupBy(DB::raw('DATE(created_at)'))
                ->orderBy('date')
                ->get();

            // Pengeluaran harian (untuk grafik)
            $dailyExpenses = Expense::whereBetween('expense_date', [$startDate, $endDate])
                ->select('expense_date as date', DB::raw('SUM(amount) as expenses'))
                ->groupBy('expense_date')
                ->orderBy('expense_date')
                ->get();

            // Merge daily data
            $dailyMap = [];
            foreach ($dailyIncome as $row) {
                $dailyMap[$row->date] = ['date' => $row->date, 'income' => (float) $row->income, 'expenses' => 0, 'transactions' => (int) $row->transactions];
            }
            foreach ($dailyExpenses as $row) {
                $dateKey = $row->date instanceof \Carbon\Carbon ? $row->date->toDateString() : (string) $row->date;
                if (!isset($dailyMap[$dateKey])) {
                    $dailyMap[$dateKey] = ['date' => $dateKey, 'income' => 0, 'expenses' => 0, 'transactions' => 0];
                }
                $dailyMap[$dateKey]['expenses'] = (float) $row->expenses;
            }
            ksort($dailyMap);

            return response()->json([
                'message' => 'OK',
                'data' => [
                    'period'              => ['start' => $startDate, 'end' => $endDate],
                    'total_income'        => (float) $income,
                    'total_expenses'      => (float) $totalExpenses,
                    'net_cash_flow'       => (float) ($income - $totalExpenses),
                    'expenses_by_category' => $expensesByCategory,
                    'daily'               => array_values($dailyMap),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal mengambil ringkasan arus kas', 'error' => $e->getMessage()], 500);
        }
    }
}
