import { test, expect } from '@playwright/test';

test.describe('Ludo Game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load landing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Ludo Master');
    await expect(page.locator('text=Play Now')).toBeVisible();
  });

  test('should navigate to lobby', async ({ page }) => {
    await page.click('text=Play Now');
    await expect(page).toHaveURL(/.*lobby/);
    await expect(page.locator('text=Create New Room')).toBeVisible();
    await expect(page.locator('text=Join Existing Room')).toBeVisible();
  });

  test('should create a room', async ({ page }) => {
    await page.goto('/lobby?mode=create');
    
    // Wait for room creation
    await expect(page.locator('text=Room')).toBeVisible({ timeout: 10000 });
    
    // Should show room code
    const roomCode = page.locator('text=/Room [A-Z0-9]{6}/');
    await expect(roomCode).toBeVisible();
  });

  test('should show players in lobby', async ({ page }) => {
    await page.goto('/lobby?mode=create');
    
    await expect(page.locator('text=Players')).toBeVisible();
    await expect(page.locator('text=Waiting for players')).toBeVisible();
  });

  test('should start game with 2 players', async ({ page, context }) => {
    // Create room with first player
    await page.goto('/lobby?mode=create');
    await expect(page.locator('text=Room')).toBeVisible({ timeout: 10000 });
    
    // Get room code
    const roomCodeText = await page.locator('text=/Room ([A-Z0-9]{6})/').textContent();
    const roomCode = roomCodeText?.match(/Room ([A-Z0-9]{6})/)?.[1];
    
    // Open second browser context for second player
    const page2 = await context.newPage();
    await page2.goto(`/lobby`);
    await page2.fill('input[placeholder="Enter your name"]', 'Player 2');
    await page2.fill('input[placeholder="ABC123"]', roomCode || '');
    await page2.click('text=Join Room');
    
    // Wait for second player to join
    await expect(page.locator('text=Player 2')).toBeVisible({ timeout: 10000 });
    
    // Start game as host
    await page.click('text=Start Game');
    
    // Should navigate to game page
    await expect(page).toHaveURL(/.*game/);
    await expect(page.locator('text=Your Turn')).toBeVisible();
    
    await page2.close();
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('h1')).toContainText('Ludo Master');
    await expect(page.locator('text=Play Now')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/lobby?mode=create');
    
    await expect(page.locator('text=Room')).toBeVisible({ timeout: 10000 });
  });
});