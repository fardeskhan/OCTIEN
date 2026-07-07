import { ReportSnapshot } from '../aggregates/ReportSnapshot';
import { RenderedArtifact } from './RenderedArtifact';

export interface ReportRenderer {
  render(snapshot: ReportSnapshot): RenderedArtifact;
}
