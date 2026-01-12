<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            'view products',
            'create products',
            'edit products',
            'delete products',
            'view transactions',
            'create transactions',
            'cancel transactions',
            'view reports',
            'export data',
            'import data',
            'manage users',
            'manage roles',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles
        $admin = Role::create(['name' => 'admin']);
        $kasir = Role::create(['name' => 'kasir']);
        $manager = Role::create(['name' => 'manager']);

        // Assign permissions to roles
        $admin->givePermissionTo(Permission::all());

        $kasir->givePermissionTo([
            'view products',
            'view transactions',
            'create transactions',
        ]);

        $manager->givePermissionTo([
            'view products',
            'create products',
            'edit products',
            'view transactions',
            'create transactions',
            'cancel transactions',
            'view reports',
            'export data',
        ]);
    }
}
