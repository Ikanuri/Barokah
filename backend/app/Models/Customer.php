<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'tier_id',
        'total_purchases',
        'transaction_count',
        'outstanding_balance',
        'notes',
    ];

    protected $casts = [
        'total_purchases' => 'decimal:2',
        'transaction_count' => 'integer',
        'outstanding_balance' => 'decimal:2',
    ];

    /**
     * Get the tier of this customer
     */
    public function tier()
    {
        return $this->belongsTo(CustomerTier::class, 'tier_id');
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }

    public function unpaidTransactions()
    {
        return $this->hasMany(Transaction::class)
            ->whereIn('payment_status', ['unpaid', 'partial']);
    }

    /**
     * Auto-upgrade customer tier based on total purchases
     */
    public function checkAndUpgradeTier()
    {
        $tiers = CustomerTier::active()->ordered()->get();
        
        foreach ($tiers->reverse() as $tier) {
            if ($this->total_purchases >= $tier->minimum_purchase) {
                $this->tier_id = $tier->id;
                $this->save();
                return $tier;
            }
        }
        
        return null;
    }
}
