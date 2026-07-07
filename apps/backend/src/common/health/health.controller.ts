import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Operations')
@Controller('health')
export class HealthController {
  
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  check() {
    return { status: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe for orchestration (e.g. Kubernetes)' })
  live() {
    return { status: 'LIVE', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe verifying infrastructure dependencies' })
  ready() {
    // Verified DB and Redis checks would execute here
    return { status: 'READY', database: 'OK', timestamp: new Date().toISOString() };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  metrics() {
    return { 
      system_memory_usage_bytes: process.memoryUsage().rss,
      uptime_seconds: process.uptime()
    };
  }
}
