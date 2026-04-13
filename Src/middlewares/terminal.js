module.exports = (resolver) => {
  return async (req, res, next) => {
    try {
      const resolvedTerminalId = await resolver(req);
      const allowedTerminalIds = Array.isArray(req.user?.terminalIds)
        ? req.user.terminalIds.map((terminalId) => Number(terminalId))
        : [];

      if (resolvedTerminalId === null || resolvedTerminalId === undefined) {
        return res.status(400).json({
          success: false,
          message: "Terminal context could not be resolved",
        });
      }

      if (!allowedTerminalIds.includes(Number(resolvedTerminalId))) {
        return res.status(403).json({
          success: false,
          message: "Terminal access denied",
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
