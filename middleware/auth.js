const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const { AppError, asyncHandler } = require('./errorHandler');
const { logger } = require('../utils/logger');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'pest-control-management',
    audience: 'pest-control-users'
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET, {
    issuer: 'pest-control-management',
    audience: 'pest-control-users'
  });
};

// Set JWT token in HTTP-only cookie
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  };

  res.cookie('jwt', token, cookieOptions);
};

// Clear JWT token cookie
const clearTokenCookie = (res) => {
  res.cookie('jwt', '', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// Authentication middleware
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Get token from cookie or Authorization header
  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    logger.logSecurity('Missing authentication token', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return next(new AppError('Access denied. No token provided.', 401));
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Check if user still exists
    const user = await prisma.staff.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        is_active: true,
        branch_id: true,
        branch: {
          select: {
            id: true,
            name: true,
            city: true
          }
        }
      }
    });

    if (!user) {
      logger.logSecurity('Token for non-existent user', {
        userId: decoded.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.is_active) {
      logger.logSecurity('Token for inactive user', {
        userId: user.id,
        email: user.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      return next(new AppError('Your account has been deactivated. Please contact administrator.', 401));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    logger.logSecurity('Invalid authentication token', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

// Authorization middleware - check user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Please authenticate first.', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.logSecurity('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip
      });
      return next(new AppError('Access denied. Insufficient permissions.', 403));
    }

    next();
  };
};

// Company-based authorization middleware
const authorizeCompany = (allowSuperadmin = true) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Please authenticate first.', 401));
    }

    // Superadmin can access all companies if allowed
    if (allowSuperadmin && req.user.role === 'SUPERADMIN') {
      return next();
    }

    // Get company_id from request (params, query, or body)
    const requestedCompanyId = req.params.companyId || req.query.company_id || req.body.company_id;
    
    if (!requestedCompanyId) {
      return next(new AppError('Company ID is required for this operation.', 400));
    }

    // Check if user belongs to the requested company
    if (req.user.company_id !== requestedCompanyId) {
      logger.logSecurity('Cross-company access attempt', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        requestedCompanyId,
        path: req.path,
        ip: req.ip
      });
      return next(new AppError('Access denied. You can only access resources from your own company.', 403));
    }

    next();
  });
};

// Branch-based authorization middleware
const authorizeBranch = (allowSuperadmin = true, allowCompanyAdmin = true) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Please authenticate first.', 401));
    }

    // Superadmin can access all branches if allowed
    if (allowSuperadmin && req.user.role === 'SUPERADMIN') {
      return next();
    }

    // Get branch_id from request (params, query, or body)
    const requestedBranchId = req.params.branchId || req.query.branch_id || req.body.branch_id;
    
    if (!requestedBranchId) {
      return next(new AppError('Branch ID is required for this operation.', 400));
    }

    // Verify branch belongs to user's company
    const branch = await prisma.branch.findUnique({
      where: { id: requestedBranchId },
      select: { company_id: true }
    });

    if (!branch) {
      return next(new AppError('Branch not found.', 404));
    }

    if (branch.company_id !== req.user.company_id) {
      logger.logSecurity('Cross-company branch access attempt', {
        userId: req.user.id,
        userCompanyId: req.user.company_id,
        branchCompanyId: branch.company_id,
        requestedBranchId,
        path: req.path,
        ip: req.ip
      });
      return next(new AppError('Access denied. Branch does not belong to your company.', 403));
    }

    // Company admins can access all branches in their company
    if (allowCompanyAdmin && req.user.role === 'ADMIN') {
      return next();
    }

    // Regular users can only access their own branch
    if (req.user.branch_id !== requestedBranchId) {
      logger.logSecurity('Cross-branch access attempt', {
        userId: req.user.id,
        userBranchId: req.user.branch_id,
        requestedBranchId,
        path: req.path,
        ip: req.ip
      });
      return next(new AppError('Access denied. You can only access resources from your own branch.', 403));
    }

    next();
  });
};

// Optional authentication - doesn't fail if no token
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await prisma.staff.findUnique({
        where: { id: decoded.id, is_active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          branch_id: true
        }
      });

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail for optional auth
      logger.debug('Optional auth failed:', error.message);
    }
  }

  next();
});

// Check if user owns resource or has admin privileges
const checkOwnership = (resourceUserField = 'assigned_to') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Access denied. Please authenticate first.', 401));
    }

    // Admins and Regional Managers can access all resources
    if (['ADMIN', 'REGIONAL_MANAGER'].includes(req.user.role)) {
      return next();
    }

    // Area Managers can access resources in their branch
    if (req.user.role === 'AREA_MANAGER') {
      // This will be checked in the route handler with the actual resource
      req.checkBranchAccess = true;
      return next();
    }

    // Technicians can only access their own resources
    if (req.user.role === 'TECHNICIAN') {
      req.checkOwnership = { field: resourceUserField, userId: req.user.id };
      return next();
    }

    return next(new AppError('Access denied. Insufficient permissions.', 403));
  };
};

// Rate limiting for sensitive operations
const sensitiveOpLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}-${req.user?.id || 'anonymous'}`;
    const now = Date.now();
    const userAttempts = attempts.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + windowMs;
    }

    if (userAttempts.count >= maxAttempts) {
      logger.logSecurity('Rate limit exceeded for sensitive operation', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.path,
        attempts: userAttempts.count
      });
      return next(new AppError('Too many attempts. Please try again later.', 429));
    }

    userAttempts.count++;
    attempts.set(key, userAttempts);
    next();
  };
};

module.exports = {
  generateToken,
  verifyToken,
  setTokenCookie,
  clearTokenCookie,
  authenticate,
  authorize,
  authorizeCompany,
  authorizeBranch,
  optionalAuth,
  checkOwnership,
  sensitiveOpLimiter
};