import { describe, it, expect } from 'vitest';

// Mocking the TABS and GROUPS for testing logic
const TABS = [
  { key: 'dashboard', roles: [], groupId: 'general' },
  { key: 'analytics', roles: ['SUPER_ADMIN', 'ADMIN', 'ANALYST'], groupId: 'growth' },
  { key: 'users', roles: ['SUPER_ADMIN', 'ADMIN', 'IT'], groupId: 'security' },
  { key: 'content', roles: ['SUPER_ADMIN', 'ADMIN', 'CONTENT_WRITER'], groupId: 'product' },
] as const;

const GROUPS = [
  { id: 'product', label: 'Product' },
  { id: 'growth', label: 'Growth' },
  { id: 'security', label: 'Security' },
] as const;

function hasAccess(userRole: string, allowedRoles: readonly string[]): boolean {
  if (allowedRoles.length === 0) return true;
  if (userRole === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(userRole);
}

describe('AdminShell Logic', () => {
  it('correctly filters tabs based on role', () => {
    const writerTabs = TABS.filter(t => hasAccess('CONTENT_WRITER', t.roles));
    expect(writerTabs.map(t => t.key)).toContain('content');
    expect(writerTabs.map(t => t.key)).toContain('dashboard');
    expect(writerTabs.map(t => t.key)).not.toContain('users');
    expect(writerTabs.map(t => t.key)).not.toContain('analytics');
  });

  it('correctly filters groups based on accessible tabs', () => {
    const userRole = 'CONTENT_WRITER';
    const accessibleTabs = TABS.filter(t => hasAccess(userRole, t.roles));
    
    const accessibleGroups = GROUPS.filter(group => 
      accessibleTabs.some(t => t.groupId === group.id)
    );

    expect(accessibleGroups.map(g => g.id)).toContain('product');
    expect(accessibleGroups.map(g => g.id)).not.toContain('security');
    expect(accessibleGroups.map(g => g.id)).not.toContain('growth');
  });

  it('allows SUPER_ADMIN to see everything', () => {
    const adminTabs = TABS.filter(t => hasAccess('SUPER_ADMIN', t.roles));
    expect(adminTabs.length).toBe(TABS.length);

    const accessibleGroups = GROUPS.filter(group => 
      adminTabs.some(t => t.groupId === group.id)
    );
    expect(accessibleGroups.length).toBe(GROUPS.length);
  });
});
