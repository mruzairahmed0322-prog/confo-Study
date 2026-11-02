<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_login_redirects_to_spa(): void
    {
        $response = $this->get('/login');
        $response->assertRedirect('/app/login');
    }

    public function test_spa_shell_loads(): void
    {
        $response = $this->get('/app/login');
        $response->assertStatus(200);
        $response->assertSee('id="root"', false);
    }
}
