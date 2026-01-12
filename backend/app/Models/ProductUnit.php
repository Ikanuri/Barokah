<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'unit_name',
        'unit_type',
        'conversion_value',
        'selling_price',
        'barcode',
        'order',
    ];

    protected $casts = [
        'conversion_value' => 'decimal:3',
        'selling_price' => 'decimal:2',
        'order' => 'integer',
    ];

    // Accessor untuk backward compatibility (frontend menggunakan 'name')
    protected $appends = ['name'];

    public function getNameAttribute()
    {
        return $this->unit_name;
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function transactionItems()
    {
        return $this->hasMany(TransactionItem::class);
    }

    // Convert unit to base quantity
    public function toBaseQuantity(float $quantity): float
    {
        return $quantity * $this->conversion_value;
    }

    // Get effective selling price (use unit price if set, otherwise calculate from base price)
    public function getEffectiveSellingPrice(): float
    {
        if ($this->selling_price) {
            return (float) $this->selling_price;
        }
        return (float) $this->product->selling_price * $this->conversion_value;
    }

    // Check if unit is weight-based (timbangan)
    public function isWeightBased(): bool
    {
        return $this->unit_type === 'weight';
    }
}
