import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Box } from "lucide-react";

export default function LumasPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader title="Casa de Lumas" description="Planned business unit." />
      <Card>
        <CardContent className="p-12 flex flex-col items-center justify-center text-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Box className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-lg font-medium">Coming soon</div>
          <p className="text-sm text-muted-foreground max-w-md">
            Casa de Lumas is a future business unit on the OCTIEN multi-business roadmap. It will use the same
            shared ERP modules (inventory, procurement, sales, finance) once onboarded.
          </p>
        </CardContent>
      </Card>
    </WorkspaceLayout>
  );
}
