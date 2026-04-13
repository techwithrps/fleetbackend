module.exports = (resolver) => {
  return async (req, res, next) => {
    try {
      const expectedTenantId = await resolver(req);
      const currentTenantId = Number(req.user?.tenantId || 0);

      if (!expectedTenantId) {
        return res.status(400).json({
          success: false,
          message: "Tenant context could not be resolved",
        });
      }

      if (currentTenantId !== Number(expectedTenantId)) {
        return res.status(403).json({
          success: false,
          message: "Cross-tenant access is not allowed",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
