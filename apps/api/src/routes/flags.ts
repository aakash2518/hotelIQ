import { Router, Request, Response } from 'express';
import { logger } from '@hoteliq/observability';
import { getAllFlags, getFlag, setFlag } from '@hoteliq/agents';

const router = Router();

/**
 * GET /api/flags
 * Retrieve all currently set feature flags.
 * Returns: { success: true, data: { flags: Record<string, any>, timestamp: string } }
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const flags = getAllFlags();
    
    logger.info({ flagsRequested: true }, 'Feature flags requested');
    
    res.json({
      success: true,
      data: {
        flags,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch feature flags');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags',
      code: 'FETCH_FLAGS_ERROR'
    });
  }
});

/**
 * PUT /api/flags/:name
 * Update the value of a specific feature flag.
 * Returns: { success: true, data: { flag: string, oldValue: any, newValue: any, timestamp: string } }
 */
router.put('/:name', (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required',
        code: 'BAD_REQUEST'
      });
    }

    const oldValue = getFlag(name);
    setFlag(name, value);

    logger.info(
      {
        flagName: name,
        oldValue,
        newValue: value,
        updatedBy: 'api',
      },
      `Feature flag "${name}" updated`
    );

    res.json({
      success: true,
      data: {
        flag: name,
        oldValue,
        newValue: value,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    logger.error({ error, flagName: req.params.name }, 'Failed to update feature flag');
    res.status(500).json({
      success: false,
      error: 'Failed to update feature flag',
      code: 'UPDATE_FLAG_ERROR'
    });
  }
});

export default router;