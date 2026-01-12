<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerTier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'discount_percentage',
        'minimum_purchase',
        'color',
        'icon',
        'description',
        'order',
        'is_active',
    ];

    protected $casts = [
        'discount_percentage' => 'decimal:2',
        'minimum_purchase' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Get customers in this tier
     */
    public function customers()
    {
        return $this->hasMany(Customer::class, 'tier_id');
    }

    /**
     * Scope for active tiers only
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope ordered by tier level
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('order', 'asc');
    }
}
