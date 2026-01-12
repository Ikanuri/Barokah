<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function index(Request $request)
    {
        $query = Transaction::with(['user', 'customer', 'items.product', 'items.productUnit']);

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', $request->start_date . ' 00:00:00');
        }
        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', $request->end_date . ' 23:59:59');
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        // Filter by payment status
        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        // Filter by customer
        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filter by kasir
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Search by transaction code
        if ($request->filled('search')) {
            $query->where('transaction_code', 'like', '%' . $request->search . '%');
        }

        $perPage = $request->get('per_page', 15);
        $transactions = $query->latest()->paginate($perPage);

        // Transform data to match frontend expectations
        $transformedData = $transactions->getCollection()->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'invoice_number' => $transaction->transaction_code,
                'date' => $transaction->created_at->toISOString(),
                'total' => (float) $transaction->total,
                'payment_method' => $transaction->payment_method,
                'payment_status' => $transaction->payment_status,
                'payment_amount' => (float) $transaction->paid_amount,
                'paid_total' => (float) $transaction->paid_total,
                'change' => (float) $transaction->change_amount,
                'customer' => $transaction->customer ? [
                    'id' => $transaction->customer->id,
                    'name' => $transaction->customer->name,
                    'phone' => $transaction->customer->phone,
                ] : null,
                'guest_name' => $transaction->guest_name,
                'cashier' => [
                    'name' => $transaction->user->name ?? 'Unknown',
                ],
                'items_count' => $transaction->items->count(),
                'status' => $transaction->status,
            ];
        });

        return response()->json([
            'data' => $transformedData,
            'meta' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_unit_id' => 'nullable|exists:product_units,id',
            'items.*.variant_name' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.notes' => 'nullable|string',
            'customer_id' => 'nullable|exists:customers,id',
            'guest_name' => 'nullable|string|max:255',
            'payment_status' => 'nullable|in:paid,unpaid,partial',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,transfer,qris',
            'notes' => 'nullable|string',
            'ignore_stock' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $subtotal = 0;
            $transactionItems = [];
            $ignoreStock = $validated['ignore_stock'] ?? false;

            // Calculate subtotal and prepare items
            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Check if using unit
                if (isset($item['product_unit_id']) && $item['product_unit_id']) {
                    $productUnit = $product->units()->findOrFail($item['product_unit_id']);
                    $unitPrice = $productUnit->getEffectiveSellingPrice();
                    $baseQuantity = $productUnit->toBaseQuantity($item['quantity']);
                } else {
                    $unitPrice = (float) $product->selling_price;
                    $baseQuantity = $item['quantity'];
                }

                // Check stock ONLY if not ignoring stock
                if (!$ignoreStock && $product->stock_quantity < $baseQuantity) {
                    throw new \Exception("Insufficient stock for product: {$product->name}. Available: {$product->stock_quantity}, Requested: {$baseQuantity}");
                }

                $itemSubtotal = $unitPrice * $item['quantity'];
                $subtotal += $itemSubtotal;

                $transactionItems[] = [
                    'product' => $product,
                    'product_unit_id' => $item['product_unit_id'] ?? null,
                    'variant_name' => $item['variant_name'] ?? null,
                    'quantity' => $item['quantity'],
                    'base_quantity' => $baseQuantity,
                    'unit_price' => $unitPrice,
                    'subtotal' => $itemSubtotal,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            $tax = $validated['tax'] ?? 0;
            $discount = $validated['discount'] ?? 0;
            $total = $subtotal + $tax - $discount;
            
            // Auto-detect payment status based on paid_amount
            $paidAmountValue = $validated['paid_amount'];
            if ($paidAmountValue == 0) {
                $paymentStatus = 'unpaid';
                $paidAmount = 0;
                $paidTotal = 0;
                $changeAmount = 0;
            } elseif ($paidAmountValue < $total) {
                $paymentStatus = 'partial';
                $paidAmount = $paidAmountValue;
                $paidTotal = $paidAmountValue;
                $changeAmount = 0;
            } else {
                $paymentStatus = 'paid';
                $paidAmount = $paidAmountValue;
                $paidTotal = $paidAmountValue;
                $changeAmount = $paidAmountValue - $total;
            }

            // Create transaction
            $transaction = Transaction::create([
                'transaction_code' => Transaction::generateTransactionCode(),
                'user_id' => auth()->id(),
                'customer_id' => $validated['customer_id'] ?? null,
                'guest_name' => $validated['guest_name'] ?? null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => $total,
                'paid_amount' => $paidAmount,
                'paid_total' => $paidTotal,
                'change_amount' => $changeAmount,
                'payment_method' => $validated['payment_method'],
                'payment_status' => $paymentStatus,
                'status' => 'completed',
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create transaction items and reduce stock
            foreach ($transactionItems as $item) {
                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $item['product']->id,
                    'product_unit_id' => $item['product_unit_id'],
                    'variant_name' => $item['variant_name'],
                    'quantity' => $item['quantity'],
                    'base_quantity' => $item['base_quantity'],
                    'unit_price' => $item['unit_price'],
                    'subtotal' => $item['subtotal'],
                    'notes' => $item['notes'],
                ]);

                // Reduce stock ONLY if not ignoring stock
                if (!$ignoreStock) {
                    $item['product']->reduceStock(
                        $item['base_quantity'],
                        $transaction,
                        auth()->user()
                    );
                } else {
                    // If ignoring stock, allow negative stock
                    $item['product']->decrement('stock_quantity', $item['base_quantity']);
                }
            }

            // Update customer statistics if customer is set
            if ($transaction->customer_id) {
                $customer = $transaction->customer;
                $customer->increment('transaction_count');
                $customer->increment('total_purchases', $total);
                
                // Update outstanding balance if unpaid or partial
                if ($paymentStatus === 'unpaid') {
                    $customer->increment('outstanding_balance', $total);
                } elseif ($paymentStatus === 'partial') {
                    $customer->increment('outstanding_balance', $total - $paidTotal);
                }
            }

            return response()->json([
                'message' => 'Transaction created successfully',
                'data' => $transaction->load(['items.product', 'items.productUnit', 'customer']),
            ], 201);
        });
    }

    public function show($id)
    {
        $transaction = Transaction::with(['user', 'customer', 'items.product', 'items.productUnit'])
            ->findOrFail($id);

        // Transform to match frontend expectations
        return response()->json([
            'data' => [
                'id' => $transaction->id,
                'invoice_number' => $transaction->transaction_code,
                'date' => $transaction->created_at->toISOString(),
                'total' => (float) $transaction->total,
                'payment_method' => $transaction->payment_method,
                'payment_status' => $transaction->payment_status,
                'payment_amount' => (float) $transaction->paid_amount,
                'paid_total' => (float) $transaction->paid_total,
                'change' => (float) $transaction->change_amount,
                'customer' => $transaction->customer ? [
                    'id' => $transaction->customer->id,
                    'name' => $transaction->customer->name,
                    'phone' => $transaction->customer->phone,
                ] : null,
                'guest_name' => $transaction->guest_name,
                'cashier' => [
                    'name' => $transaction->user ? $transaction->user->name : 'Unknown',
                ],
                'items_count' => $transaction->items->count(),
                'status' => $transaction->status,
                'notes' => $transaction->notes, // ✅ Add transaction notes
                'items' => $transaction->items->map(function ($item) {
                    // Get unit name: prefer productUnit, fallback to product's base_unit
                    $unitName = null;
                    if ($item->productUnit) {
                        $unitName = $item->productUnit->unit_name;
                    } elseif ($item->product) {
                        $unitName = $item->product->base_unit ?? 'biji';
                    }
                    
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_unit_id' => $item->product_unit_id,
                        'product_name' => $item->product ? $item->product->name : 'Unknown Product',
                        'unit_name' => $unitName,
                        'variant_name' => $item->variant_name,
                        'quantity' => (int) $item->quantity,
                        'price' => (float) $item->unit_price,
                        'subtotal' => (float) $item->subtotal,
                        'notes' => $item->notes,
                    ];
                })->values()->all(),
            ]
        ]);
    }

    public function cancel($id)
    {
        $transaction = Transaction::findOrFail($id);

        if ($transaction->status === 'cancelled') {
            return response()->json([
                'message' => 'Transaction already cancelled',
            ], 422);
        }

        return DB::transaction(function () use ($transaction) {
            // Restore stock
            foreach ($transaction->items as $item) {
                $item->product->addStock(
                    $item->base_quantity,
                    "Stock restored from cancelled transaction {$transaction->transaction_code}"
                );
            }

            $transaction->update(['status' => 'cancelled']);

            return response()->json([
                'message' => 'Transaction cancelled successfully',
                'data' => $transaction,
            ]);
        });
    }

    // Update unpaid transaction (edit items)
    public function update(Request $request, $id)
    {
        $transaction = Transaction::with('items')->findOrFail($id);

        // Allow editing ALL transactions (even paid ones - for adding items)
        // If paid, we'll add to existing items instead of replacing

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.product_unit_id' => 'nullable|exists:product_units,id',
            'items.*.variant_name' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'customer_id' => 'nullable|exists:customers,id',
            'paid_amount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'ignore_stock' => 'nullable|boolean',
        ]);

        return DB::transaction(function () use ($transaction, $validated, $request) {
            $isPaid = $transaction->payment_status === 'paid';
            $ignoreStock = $validated['ignore_stock'] ?? false;
            
            if ($isPaid) {
                // For paid transactions: ADD items (don't replace)
                $subtotal = $transaction->subtotal;
                $transactionItems = [];

                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if (isset($item['product_unit_id']) && $item['product_unit_id']) {
                        $productUnit = $product->units()->findOrFail($item['product_unit_id']);
                        $unitPrice = $productUnit->getEffectiveSellingPrice();
                        $baseQuantity = $productUnit->toBaseQuantity($item['quantity']);
                    } else {
                        $unitPrice = (float) $product->selling_price;
                        $baseQuantity = $item['quantity'];
                    }

                    if (!$ignoreStock && $product->stock_quantity < $baseQuantity) {
                        throw new \Exception("Insufficient stock for product: {$product->name}");
                    }

                    $itemSubtotal = $unitPrice * $item['quantity'];
                    $subtotal += $itemSubtotal;

                    $transactionItems[] = [
                        'product' => $product,
                        'product_unit_id' => $item['product_unit_id'] ?? null,
                        'variant_name' => $item['variant_name'] ?? null,
                        'quantity' => $item['quantity'],
                        'base_quantity' => $baseQuantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $itemSubtotal,
                    ];
                }

                $total = $subtotal;

                // Update transaction total (add to existing)
                $transaction->update([
                    'subtotal' => $subtotal,
                    'total' => $total,
                ]);

                // Create new items (don't delete old ones) and reduce stock
                foreach ($transactionItems as $item) {
                    TransactionItem::create([
                        'transaction_id' => $transaction->id,
                        'product_id' => $item['product']->id,
                        'product_unit_id' => $item['product_unit_id'],
                        'variant_name' => $item['variant_name'],
                        'quantity' => $item['quantity'],
                        'base_quantity' => $item['base_quantity'],
                        'unit_price' => $item['unit_price'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    $item['product']->decrement('stock_quantity', $item['base_quantity']);
                }

                // Update customer if applicable
                if ($transaction->customer_id) {
                    $customer = $transaction->customer;
                    $addedAmount = $total - $transaction->getOriginal('total');
                    $customer->increment('total_purchases', $addedAmount);
                }

            } else {
                // For unpaid/partial: REPLACE items
                // Build a map of old items by product_id + product_unit_id for comparison
                $oldItemsMap = [];
                foreach ($transaction->items as $oldItem) {
                    $key = $oldItem->product_id . '_' . ($oldItem->product_unit_id ?? '0');
                    if (!isset($oldItemsMap[$key])) {
                        $oldItemsMap[$key] = [
                            'product_id' => $oldItem->product_id,
                            'product' => $oldItem->product,
                            'base_quantity' => 0,
                        ];
                    }
                    $oldItemsMap[$key]['base_quantity'] += $oldItem->base_quantity;
                }

                // Delete old items (we'll recreate them)
                $transaction->items()->delete();

                // Recalculate with new items
                $subtotal = 0;
                $transactionItems = [];
                $newItemsMap = [];

                foreach ($validated['items'] as $item) {
                    $product = Product::findOrFail($item['product_id']);

                    if (isset($item['product_unit_id']) && $item['product_unit_id']) {
                        $productUnit = $product->units()->findOrFail($item['product_unit_id']);
                        $unitPrice = $productUnit->getEffectiveSellingPrice();
                        $baseQuantity = $productUnit->toBaseQuantity($item['quantity']);
                    } else {
                        $unitPrice = (float) $product->selling_price;
                        $baseQuantity = $item['quantity'];
                    }

                    $itemSubtotal = $unitPrice * $item['quantity'];
                    $subtotal += $itemSubtotal;

                    $transactionItems[] = [
                        'product' => $product,
                        'product_unit_id' => $item['product_unit_id'] ?? null,
                        'variant_name' => $item['variant_name'] ?? null,
                        'quantity' => $item['quantity'],
                        'base_quantity' => $baseQuantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $itemSubtotal,
                    ];

                    // Track new items for stock adjustment
                    $key = $product->id . '_' . ($item['product_unit_id'] ?? '0');
                    if (!isset($newItemsMap[$key])) {
                        $newItemsMap[$key] = [
                            'product' => $product,
                            'base_quantity' => 0,
                        ];
                    }
                    $newItemsMap[$key]['base_quantity'] += $baseQuantity;
                }

                // Adjust stock based on difference between old and new
                // For each old item, restore stock
                foreach ($oldItemsMap as $key => $oldData) {
                    if (isset($newItemsMap[$key])) {
                        // Product exists in both old and new
                        $diff = $newItemsMap[$key]['base_quantity'] - $oldData['base_quantity'];
                        if ($diff > 0) {
                            // New quantity is MORE, reduce stock by difference
                            if (!$ignoreStock && $oldData['product']->stock_quantity < $diff) {
                                throw new \Exception("Insufficient stock for product: {$oldData['product']->name}");
                            }
                            $oldData['product']->decrement('stock_quantity', $diff);
                        } elseif ($diff < 0) {
                            // New quantity is LESS, add stock back by difference
                            $oldData['product']->increment('stock_quantity', abs($diff));
                        }
                        // If diff == 0, no change needed
                    } else {
                        // Product was in old but NOT in new, restore all
                        $oldData['product']->increment('stock_quantity', $oldData['base_quantity']);
                    }
                }

                // For new products that weren't in old items, reduce stock
                foreach ($newItemsMap as $key => $newData) {
                    if (!isset($oldItemsMap[$key])) {
                        // New product not in old items, reduce stock
                        if (!$ignoreStock && $newData['product']->stock_quantity < $newData['base_quantity']) {
                            throw new \Exception("Insufficient stock for product: {$newData['product']->name}");
                        }
                        $newData['product']->decrement('stock_quantity', $newData['base_quantity']);
                    }
                }

                $total = $subtotal;
                
                // 🔧 FIX: Use existing paid_total from database, NOT from request
                // Only makePayment() endpoint should update paid_total
                $currentPaidTotal = $transaction->paid_total;
                
                // Recalculate payment status based on NEW total vs EXISTING paid_total
                if ($currentPaidTotal == 0) {
                    $paymentStatus = 'unpaid';
                } elseif ($currentPaidTotal < $total) {
                    $paymentStatus = 'partial';
                } else {
                    // If paid_total >= new total, mark as paid
                    $paymentStatus = 'paid';
                }

                // Update transaction (DO NOT change paid_total here)
                $transaction->update([
                    'customer_id' => $validated['customer_id'] ?? $transaction->customer_id,
                    'subtotal' => $subtotal,
                    'total' => $total,
                    // paid_total stays the same - only updated via makePayment()
                    'payment_status' => $paymentStatus,
                    'notes' => $validated['notes'] ?? $transaction->notes,
                ]);

                // Create new items (stock already adjusted above in differential loop)
                foreach ($transactionItems as $item) {
                    TransactionItem::create([
                        'transaction_id' => $transaction->id,
                        'product_id' => $item['product']->id,
                        'product_unit_id' => $item['product_unit_id'],
                        'variant_name' => $item['variant_name'],
                        'quantity' => $item['quantity'],
                        'base_quantity' => $item['base_quantity'],
                        'unit_price' => $item['unit_price'],
                        'subtotal' => $item['subtotal'],
                    ]);
                    
                    // Stock adjustment already done in differential loop above
                    // DO NOT reduce stock here to avoid double reduction
                }

                // 🔧 FIX: Update customer outstanding balance based on total change only
                // paid_total doesn't change during edit, so we only adjust for total difference
                if ($transaction->customer_id) {
                    $customer = $transaction->customer;
                    $oldTotal = $transaction->getOriginal('total');
                    $oldPaidTotal = $transaction->getOriginal('paid_total');
                    $newTotal = $total;
                    $newPaidTotal = $currentPaidTotal; // Same as old, not changed
                    
                    $oldBalance = $oldTotal - $oldPaidTotal;
                    $newBalance = $newTotal - $newPaidTotal;
                    $difference = $newBalance - $oldBalance;
                    
                    $customer->increment('outstanding_balance', $difference);
                }
            }

            return response()->json([
                'message' => 'Transaction updated successfully',
                'data' => $transaction->load(['items.product', 'items.productUnit', 'customer']),
            ]);
        });
    }

    // Make payment for unpaid/partial transaction
    public function makePayment(Request $request, $id)
    {
        $transaction = Transaction::with('customer')->findOrFail($id);

        if ($transaction->payment_status === 'paid') {
            return response()->json([
                'message' => 'Transaction already fully paid',
            ], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,card,transfer,qris',
        ]);

        $remainingAmount = $transaction->total - $transaction->paid_total;
        $paymentAmount = $validated['amount'];

        if ($paymentAmount > $remainingAmount) {
            $paymentAmount = $remainingAmount;
        }

        $newPaidTotal = $transaction->paid_total + $paymentAmount;
        $newPaymentStatus = ($newPaidTotal >= $transaction->total) ? 'paid' : 'partial';
        $changeAmount = ($newPaymentStatus === 'paid') ? ($validated['amount'] - $remainingAmount) : 0;

        $transaction->update([
            'paid_total' => $newPaidTotal,
            'paid_amount' => $validated['amount'],
            'payment_status' => $newPaymentStatus,
            'payment_method' => $validated['payment_method'],
            'change_amount' => $changeAmount,
        ]);

        // Update customer outstanding balance
        if ($transaction->customer_id) {
            $transaction->customer->decrement('outstanding_balance', $paymentAmount);
        }

        return response()->json([
            'message' => 'Payment recorded successfully',
            'data' => $transaction->fresh(),
        ]);
    }

    // Update payment method for unpaid/partial transactions
    public function updatePaymentMethod(Request $request, $id)
    {
        $transaction = Transaction::findOrFail($id);

        // Validate that transaction is not fully paid
        if ($transaction->payment_status === 'paid' && $transaction->paid_total >= $transaction->total) {
            return response()->json([
                'message' => 'Cannot change payment method for completed transactions'
            ], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:cash,card,transfer,qris',
        ]);

        $transaction->update([
            'payment_method' => $validated['payment_method'],
        ]);

        return response()->json([
            'message' => 'Payment method updated successfully',
            'data' => $transaction->fresh(),
        ]);
    }

    // Get transaction statistics
    public function statistics(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfDay());

        $stats = [
            'total_transactions' => Transaction::whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'completed')
                ->count(),
            
            'total_revenue' => Transaction::whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'completed')
                ->sum('total'),
            
            'total_items_sold' => TransactionItem::whereHas('transaction', function ($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate])
                    ->where('status', 'completed');
            })->sum('quantity'),

            'payment_methods' => Transaction::whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'completed')
                ->select('payment_method', DB::raw('COUNT(*) as count'), DB::raw('SUM(total) as total'))
                ->groupBy('payment_method')
                ->get(),

            'top_products' => TransactionItem::select('product_id', DB::raw('SUM(quantity) as total_sold'))
                ->whereHas('transaction', function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('created_at', [$startDate, $endDate])
                        ->where('status', 'completed');
                })
                ->groupBy('product_id')
                ->orderByDesc('total_sold')
                ->with('product')
                ->limit(10)
                ->get(),

            'daily_sales' => Transaction::whereBetween('created_at', [$startDate, $endDate])
                ->where('status', 'completed')
                ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as transactions'), DB::raw('SUM(total) as revenue'))
                ->groupBy('date')
                ->orderBy('date')
                ->get(),
        ];

        return response()->json($stats);
    }

    // Get cashier performance & top products per cashier
    public function cashierStatistics(Request $request)
    {
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfDay());
        
        // Get all cashiers with their transaction stats
        $cashiers = DB::table('users')
            ->leftJoin('transactions', function($join) use ($startDate, $endDate) {
                $join->on('users.id', '=', 'transactions.user_id')
                     ->whereBetween('transactions.created_at', [$startDate, $endDate])
                     ->where('transactions.status', 'completed');
            })
            ->select(
                'users.id',
                'users.name',
                DB::raw('COUNT(DISTINCT transactions.id) as total_transactions'),
                DB::raw('COALESCE(SUM(transactions.total), 0) as total_revenue')
            )
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('total_revenue')
            ->get();
        
        // Get top products for each cashier
        $cashierProducts = [];
        foreach ($cashiers as $cashier) {
            $topProducts = TransactionItem::select(
                    'products.id',
                    'products.name',
                    'products.sku',
                    DB::raw('SUM(transaction_items.quantity) as total_sold'),
                    DB::raw('SUM(transaction_items.subtotal) as total_revenue')
                )
                ->join('products', 'transaction_items.product_id', '=', 'products.id')
                ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
                ->where('transactions.user_id', $cashier->id)
                ->whereBetween('transactions.created_at', [$startDate, $endDate])
                ->where('transactions.status', 'completed')
                ->groupBy('products.id', 'products.name', 'products.sku')
                ->orderByDesc('total_sold')
                ->limit(5)
                ->get();
            
            $cashierProducts[$cashier->id] = [
                'cashier_id' => $cashier->id,
                'cashier_name' => $cashier->name,
                'total_transactions' => (int) $cashier->total_transactions,
                'total_revenue' => (float) $cashier->total_revenue,
                'top_products' => $topProducts->map(function($product) {
                    return [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'sku' => $product->sku,
                        'total_sold' => (int) $product->total_sold,
                        'total_revenue' => (float) $product->total_revenue,
                    ];
                }),
            ];
        }
        
        return response()->json([
            'cashiers' => array_values($cashierProducts),
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
        ]);
    }
}
