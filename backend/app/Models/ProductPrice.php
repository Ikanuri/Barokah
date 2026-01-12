<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductPrice extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'price_type',
        'price_name',
        'price',
        'min_quantity',
        'is_active',
        'priority',
        'description',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'min_quantity' => 'integer',
        'is_active' => 'boolean',
        'priority' => 'integer',
    ];

    /**
     * Relationship: ProductPrice belongs to Product
     */
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope: Only active prices
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Order by priority (highest first)
     */
    public function scopeByPriority($query)
    {
        return $query->orderBy('priority', 'desc');
    }

    /**
     * Get best price for given quantity
     */
    public static function getBestPrice($productId, $quantity = 1)
    {
        return self::where('product_id', $productId)
            ->active()
            ->where('min_quantity', '<=', $quantity)
            ->byPriority()
            ->orderBy('price', 'asc')
            ->first();
    }

    /**
     * Price type constants
     */
    const TYPE_NORMAL = 'normal';
    const TYPE_WHOLESALE = 'wholesale';
    const TYPE_MEMBER = 'member';
    const TYPE_RETAIL = 'retail';
}
