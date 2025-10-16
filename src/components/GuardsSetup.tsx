import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { getGuardsData, saveGuardsData } from "@/utils/storage";
import { Guard } from "@/types/guards";
import { Trash2, UserPlus, Save, Shield } from "lucide-react";
import { toast } from "sonner";

interface GuardsSetupProps {
  onComplete: () => void;
}

const GuardsSetup = ({ onComplete }: GuardsSetupProps) => {
  const [name, setName] = useState("");
  const [certified, setCertified] = useState(false);
  const [guards, setGuards] = useState<Guard[]>([]);

  useEffect(() => {
    const data = getGuardsData();
    setGuards(data.guards);
  }, []);

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error("נא להזין שם מאבטח");
      return;
    }

    const newGuard: Guard = {
      name: name.trim(),
      certified
    };

    setGuards([...guards, newGuard]);
    setName("");
    setCertified(false);
    toast.success("מאבטח נוסף לרשימה");
  };

  const handleDelete = (index: number) => {
    const newGuards = guards.filter((_, i) => i !== index);
    setGuards(newGuards);
    toast.success("מאבטח הוסר מהרשימה");
  };

  const handleSave = () => {
    if (guards.length === 0) {
      toast.error("נא להוסיף לפחות מאבטח אחד");
      return;
    }

    const data = getGuardsData();
    data.guards = guards;
    saveGuardsData(data);
    toast.success("המאבטחים נשמרו בהצלחה");
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            הזנת מאבטחים
          </h1>
          <p className="text-muted-foreground">הוסף מאבטחים לרשימה לניהול משמרות</p>
        </div>

        <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">שם מלא</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="הכנס שם מאבטח"
                className="bg-background/50 border-border/50 focus:border-primary transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="certified"
                checked={certified}
                onCheckedChange={(checked) => setCertified(checked as boolean)}
                className="border-border/50"
              />
              <label htmlFor="certified" className="text-sm font-medium cursor-pointer text-foreground">
                מוסמך
              </label>
            </div>

            <Button
              onClick={handleAdd}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-[var(--shadow-glow)]"
            >
              <UserPlus className="w-4 h-4 ml-2" />
              הוסף מאבטח
            </Button>
          </div>
        </Card>

        {guards.length > 0 && (
          <Card className="p-6 shadow-[var(--shadow-card)] border-border/50 bg-gradient-to-br from-card to-card/80">
            <h2 className="text-xl font-semibold mb-4 text-foreground">רשימת מאבטחים ({guards.length})</h2>
            <div className="space-y-2">
              {guards.map((guard, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="font-medium text-foreground">{guard.name}</span>
                    {guard.certified && (
                      <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">
                        מוסמך
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
                    className="hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleSave}
              className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground transition-all shadow-[var(--shadow-glow)]"
            >
              <Save className="w-4 h-4 ml-2" />
              שמור מאבטחים והמשך
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GuardsSetup;
