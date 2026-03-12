<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'transaction_code',
        'user_id',
        'customer_id',
        'guest_name',
        'subtotal',
        'tax',
        'discount',
        'total',
        'paid_amount',
        'paid_total',
        'change_amount',
        'payment_method',
        'payment_status',
        'status',
        'notes',
        'change_returned',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'paid_total' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'change_returned' => 'boolean',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function items()
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    // Generate unique transaction code (MUST be called inside DB transaction)
    public static function generateTransactionCode(): string
    {
        $date = now()->format('Ymd');
        
        // Lock the table to prevent race conditions
        $lastTransaction = self::where('transaction_code', 'like', "TRX{$date}%")
            ->lockForUpdate()
            ->orderBy('transaction_code', 'desc')
            ->first();

        if ($lastTransaction) {
            // Extract sequence number and increment
            $lastSequence = intval(substr($lastTransaction->transaction_code, -4));
            $sequence = $lastSequence + 1;
        } else {
            $sequence = 1;
        }
        
        $code = 'TRX' . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
        
        // Double check uniqueness with retry
        $maxAttempts = 50;
        $attempt = 0;
        
        while (self::where('transaction_code', $code)->exists() && $attempt < $maxAttempts) {
            $sequence++;
            $code = 'TRX' . $date . str_pad($sequence, 4, '0', STR_PAD_LEFT);
            $attempt++;
        }
        
        // Fallback: add timestamp if still duplicate
        if (self::where('transaction_code', $code)->exists()) {
            $code = 'TRX' . $date . str_pad($sequence + 1, 4, '0', STR_PAD_LEFT) . '_' . now()->format('His');
        }
        
        return $code;
    }
}
