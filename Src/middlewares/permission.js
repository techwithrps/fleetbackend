module.exports = (requiredPermission) => {
  return (req, res, next) => {
    const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!requiredPermission) {
      return next();
    }

    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Missing ${requiredPermission}.`,
      });
    }

    return next();
  };
};
