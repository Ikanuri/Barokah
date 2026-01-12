<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'name',
        'sku',
        'barcode',
        'category_id',
        'description',
        'base_price',
        'selling_price',
        'base_unit',
        'stock_quantity',
        'minimum_stock',
        'image',
        'is_active',
        'variants', // Add variants field
    ];

    protected $casts = [
        'base_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'stock_quantity' => 'integer',
        'minimum_stock' => 'integer',
        'is_active' => 'boolean',
        'variants' => 'array', // Cast variants to array
    ];

    protected $appends = ['stock_status'];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function units()
    {
        return $this->hasMany(ProductUnit::class)->orderBy('order');
    }

    public function prices()
    {
        return $this->hasMany(ProductPrice::class)->orderBy('priority', 'desc');
    }

    public function transactionItems()
    {
        return $this->hasMany(TransactionItem::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    // Check if stock is low
    public function getStockStatusAttribute()
    {
        if ($this->stock_quantity <= 0) {
            return 'out_of_stock';
        } elseif ($this->stock_quantity <= $this->minimum_stock) {
            return 'low_stock';
        }
        return 'in_stock';
    }

    // Reduce stock (dalam unit terkecil)
    public function reduceStock(int $quantity, Transaction $transaction = null, User $user = null)
    {
        $stockBefore = $this->stock_quantity;
        $this->stock_quantity -= $quantity;
        $this->save();

        // Log stock movement
        StockMovement::create([
            'product_id' => $this->id,
            'user_id' => $user?->id ?? auth()->id(),
            'transaction_id' => $transaction?->id,
            'type' => 'out',
            'quantity' => $quantity,
            'stock_before' => $stockBefore,
            'stock_after' => $this->stock_quantity,
            'notes' => 'Stock reduced from transaction',
        ]);
    }

    // Add stock (dalam unit terkecil)
    public function addStock(int $quantity, string $notes = null)
    {
        $stockBefore = $this->stock_quantity;
        $this->stock_quantity += $quantity;
        $this->save();

        // Log stock movement
        StockMovement::create([
            'product_id' => $this->id,
            'user_id' => auth()->id(),
            'type' => 'in',
            'quantity' => $quantity,
            'stock_before' => $stockBefore,
            'stock_after' => $this->stock_quantity,
            'notes' => $notes ?? 'Stock added',
        ]);
    }
}
