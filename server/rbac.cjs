// Role-Based Access Control (RBAC) System
// Defines permissions for each role

const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  IT: 'IT',
  DESIGNER: 'DESIGNER',
  CONTENT_WRITER: 'CONTENT_WRITER',
  ADS_MANAGER: 'ADS_MANAGER',
  ANALYST: 'ANALYST',
  VIEW_ONLY: 'VIEW_ONLY',
};

// Permission definitions
const PERMISSIONS = {
  // User Management
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_MANAGE_ROLES: 'users:manage_roles',

  // Content Management
  CONTENT_READ: 'content:read',
  CONTENT_CREATE: 'content:create',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',

  // Blog
  BLOG_READ: 'blog:read',
  BLOG_CREATE: 'blog:create',
  BLOG_UPDATE: 'blog:update',
  BLOG_DELETE: 'blog:delete',
  BLOG_PUBLISH: 'blog:publish',

  // SEO
  SEO_READ: 'seo:read',
  SEO_UPDATE: 'seo:update',

  // Ads Management
  ADS_READ: 'ads:read',
  ADS_CREATE: 'ads:create',
  ADS_UPDATE: 'ads:update',
  ADS_DELETE: 'ads:delete',
  REVENUE_ADS_MANAGE: 'revenue:ads:manage',

  // Revenue
  REVENUE_READ: 'revenue:read',
  REVENUE_CREATE: 'revenue:create',
  REVENUE_UPDATE: 'revenue:update',

  // Product Management
  PRODUCT_CALCULATORS_MANAGE: 'product:calculators:manage',
  PRODUCT_FLAGS_MANAGE: 'product:flags:manage',
  GROWTH_EXPERIMENTS_MANAGE: 'growth:experiments:manage',

  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  ANALYTICS_FULL: 'analytics:full',
  GROWTH_ANALYTICS_MANAGE: 'growth:analytics:manage',
  GROWTH_SEO_MANAGE: 'growth:seo:manage',

  // System Settings
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_SYSTEM: 'settings:system',

  // Design/Theme
  DESIGN_READ: 'design:read',
  DESIGN_UPDATE: 'design:update',

  // Logs
  LOGS_READ: 'logs:read',
  LOGS_EXPORT: 'logs:export',
  LOGS_FULL: 'logs:full',

  // Feature Flags
  FEATURES_READ: 'features:read',
  FEATURES_UPDATE: 'features:update',

  // Tests (internal)
  TESTS_RUN: 'tests:run',
  TESTS_VIEW: 'tests:view',

  // Ops & Health
  OPS_HEALTH_VIEW: 'ops:health:view',
  OPS_DIAGNOSTICS_RUN: 'ops:diagnostics:run',
  OPS_ERRORS_VIEW: 'ops:errors:view',
  OPS_ERRORS_MANAGE: 'ops:errors:manage',
  OPS_JOBS_VIEW: 'ops:jobs:view',
  OPS_JOBS_RUN: 'ops:jobs:run',
  OPS_JOBS_SCHEDULE: 'ops:jobs:schedule',

  // Backups
  OPS_BACKUP_READ: 'ops:backups:read',
  OPS_BACKUP_CREATE: 'ops:backups:create',
  OPS_BACKUP_RESTORE: 'ops:backups:restore',
  OPS_BACKUP_SCHEDULE: 'ops:backups:schedule',

  // CMS Content
  CONTENT_MANAGE: 'content:manage',
  CONTENT_PUBLISH: 'content:publish',

  // AI Management
  AI_MANAGE: 'ai:manage',
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions

  [ROLES.ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_DELETE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.BLOG_READ,
    PERMISSIONS.BLOG_CREATE,
    PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_DELETE,
    PERMISSIONS.BLOG_PUBLISH,
    PERMISSIONS.SEO_READ,
    PERMISSIONS.SEO_UPDATE,
    PERMISSIONS.ADS_READ,
    PERMISSIONS.ADS_CREATE,
    PERMISSIONS.ADS_UPDATE,
    PERMISSIONS.REVENUE_READ,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.DESIGN_READ,
    PERMISSIONS.DESIGN_UPDATE,
    PERMISSIONS.LOGS_READ,
    PERMISSIONS.LOGS_EXPORT,
    PERMISSIONS.FEATURES_READ,
    PERMISSIONS.OPS_BACKUP_READ,
    PERMISSIONS.OPS_BACKUP_CREATE,
    PERMISSIONS.OPS_BACKUP_SCHEDULE,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.PRODUCT_CALCULATORS_MANAGE,
    PERMISSIONS.PRODUCT_FLAGS_MANAGE,
    PERMISSIONS.GROWTH_ANALYTICS_MANAGE,
    PERMISSIONS.GROWTH_SEO_MANAGE,
    PERMISSIONS.REVENUE_ADS_MANAGE,
    PERMISSIONS.GROWTH_EXPERIMENTS_MANAGE,
    PERMISSIONS.AI_MANAGE,
  ],

  [ROLES.IT]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SETTINGS_SYSTEM,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_FULL,
    PERMISSIONS.LOGS_READ,
    PERMISSIONS.LOGS_EXPORT,
    PERMISSIONS.LOGS_FULL,
    PERMISSIONS.FEATURES_READ,
    PERMISSIONS.FEATURES_UPDATE,
    PERMISSIONS.TESTS_RUN,
    PERMISSIONS.TESTS_VIEW,
    PERMISSIONS.OPS_HEALTH_VIEW,
    PERMISSIONS.OPS_DIAGNOSTICS_RUN,
    PERMISSIONS.OPS_ERRORS_VIEW,
    PERMISSIONS.OPS_ERRORS_MANAGE,
    PERMISSIONS.OPS_JOBS_VIEW,
    PERMISSIONS.OPS_JOBS_RUN,
    PERMISSIONS.OPS_JOBS_SCHEDULE,
    PERMISSIONS.OPS_BACKUP_READ,
    PERMISSIONS.OPS_BACKUP_CREATE,
    PERMISSIONS.OPS_BACKUP_SCHEDULE,
    PERMISSIONS.AI_MANAGE,
  ],

  [ROLES.DESIGNER]: [
    PERMISSIONS.DESIGN_READ,
    PERMISSIONS.DESIGN_UPDATE,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.SETTINGS_READ,
  ],

  [ROLES.CONTENT_WRITER]: [
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.CONTENT_CREATE,
    PERMISSIONS.CONTENT_UPDATE,
    PERMISSIONS.CONTENT_PUBLISH,
    PERMISSIONS.BLOG_READ,
    PERMISSIONS.BLOG_CREATE,
    PERMISSIONS.BLOG_UPDATE,
    PERMISSIONS.BLOG_PUBLISH,
    PERMISSIONS.SEO_READ,
    PERMISSIONS.SEO_UPDATE,
    PERMISSIONS.CONTENT_MANAGE,
    PERMISSIONS.CONTENT_PUBLISH,
  ],

  [ROLES.ADS_MANAGER]: [
    PERMISSIONS.ADS_READ,
    PERMISSIONS.ADS_CREATE,
    PERMISSIONS.ADS_UPDATE,
    PERMISSIONS.ADS_DELETE,
    PERMISSIONS.REVENUE_READ,
    PERMISSIONS.REVENUE_CREATE,
    PERMISSIONS.REVENUE_UPDATE,
    PERMISSIONS.ANALYTICS_READ,
  ],

  [ROLES.ANALYST]: [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.ANALYTICS_EXPORT,
    PERMISSIONS.ANALYTICS_FULL,
    PERMISSIONS.REVENUE_READ,
    PERMISSIONS.ADS_READ,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.BLOG_READ,
    PERMISSIONS.SEO_READ,
    PERMISSIONS.LOGS_READ,
  ],

  [ROLES.VIEW_ONLY]: [
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.CONTENT_READ,
    PERMISSIONS.BLOG_READ,
    PERMISSIONS.SEO_READ,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.DESIGN_READ,
  ],
};

/**
 * Check if a role has a specific permission
 */
function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
function hasAnyPermission(role, permissionList) {
  return permissionList.some(p => hasPermission(role, p));
}

/**
 * Check if a role has all of the specified permissions
 */
function hasAllPermissions(role, permissionList) {
  return permissionList.every(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
function getPermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Middleware to require specific permission(s)
 */
function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = user.role;
    const hasAccess = requiredPermissions.some(p => hasPermission(userRole, p));

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied', 
        required: requiredPermissions,
        userRole 
      });
    }

    next();
  };
}

/**
 * Middleware to require specific role(s)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        required: roles,
        userRole: user.role 
      });
    }

    next();
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  requirePermission,
  requireRole,
};
