import note from "../../../PROJECT_NOTE.md?raw";
import { Markdown } from "../Markdown";
import { Drawer } from "./Drawer";

export function ProjectNoteDrawer({ onClose }: { onClose: () => void }) {
  return (
    <Drawer title="Project Note" labelId="note-drawer-title" onClose={onClose}>
      <div className="rounded-[8px] border border-edge bg-panel p-5">
        <Markdown source={note} />
      </div>
    </Drawer>
  );
}
