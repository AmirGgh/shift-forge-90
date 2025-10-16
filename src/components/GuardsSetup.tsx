import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getGuardsData, saveGuardsData } from "@/utils/storage";
import { Guard } from "@/types/guards";
import { Trash2, UserPlus, Save, Shield } from "lucide-react";
import { toast } from "sonner";

interface GuardsSetupProps {
  onComplete: () => void;
}

const GUARD_COLORS = [
  "hsl(140, 70%, 50%)", // Green
  "hsl(200, 80%, 50%)", // Blue
  "hsl(180, 70%, 50%)", // Cyan
  "hsl(280, 70%, 60%)", // Purple
  "hsl(30, 80%, 55%)",  // Orange
  "hsl(300, 65%, 55%)", // Magenta
  "hsl(60, 70%, 50%)",  // Yellow
  "hsl(340, 75%, 55%)", // Pink
  "hsl(160, 65%, 50%)", // Teal
  "hsl(20, 75%, 55%)",  // Red-Orange
];

const SHIFT_TYPES = [
  "בוקר 6-14",
  "בוקר 7-15",
  "תמך 7-19",
  "תמך 8-20",
  "ערב 14-22",
  "ערב 15-23"
];

const GuardsSetup = ({ onComplete }: GuardsSetupProps) => {
  const [name, setName] = useState("");
  const [certified, setCertified] = useState(true);
  const [shiftType, setShiftType] = useState("בוקר 7-15");
  const [customShiftType, setCustomShiftType] = useState("");
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

    const color = GUARD_COLORS[guards.length % GUARD_COLORS.length];
    const finalShiftType = customShiftType.trim() || shiftType;

    const newGuard: Guard = {
      name: name.trim(),
      certified,
      color,
      shiftType: finalShiftType
    };

    setGuards([...guards, newGuard]);
    setName("");
    setCertified(true);
    setShiftType("בוקר 7-15");
    setCustomShiftType("");
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

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">סוג משמרת</label>
              <Select value={shiftType} onValueChange={setShiftType}>
                <SelectTrigger className="bg-background/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">ערך אחר (אופציונלי)</label>
              <Input
                type="text"
                value={customShiftType}
                onChange={(e) => setCustomShiftType(e.target.value)}
                placeholder="הכנס סוג משמרת מותאם"
                className="bg-background/50 border-border/50 focus:border-primary transition-colors"
              />
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
              {guards.map((guard, index) => {
                const isTamach = guard.shiftType?.includes("תמך");
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-background/50 rounded-lg border transition-colors"
                    style={{ 
                      borderColor: guard.color,
                      backgroundColor: isTamach ? guard.color : undefined
                    }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: guard.color }} />
                      <span className={`font-medium ${isTamach ? 'text-background' : 'text-foreground'}`}>
                        {guard.name}
                      </span>
                      {guard.certified && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isTamach ? 'bg-background/20 text-background' : 'bg-accent/20 text-accent'
                        }`}>
                          מוסמך
                        </span>
                      )}
                      {guard.shiftType && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          isTamach ? 'bg-background/20 text-background' : 'bg-primary/20 text-primary'
                        }`}>
                          {guard.shiftType}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(index)}
                      className={`transition-colors ${
                        isTamach 
                          ? 'hover:bg-background/20 text-background hover:text-background' 
                          : 'hover:bg-destructive/20 hover:text-destructive'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
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
