import { AreaVisualizer, Field } from "@/components/organism/areaVisualizer";
import { FieldSelector } from "@/components/organism/fieldSelector";
import * as React from "react";
import { useState } from "react";

export default function Dashboard(): React.ReactElement {
  const [selectedFields, setSelectedFields] = useState<Field[]>([]);

  const totalArea = selectedFields.reduce((sum, field) => sum + field.area, 0);
  const totalUsedArea = selectedFields.reduce(
    (sum, field) => sum + field.usedArea,
    0
  );

  const handleAddField = (field: Field) => {
    setSelectedFields([...selectedFields, field]);
  };

  const handleRemoveField = (id: string) => {
    setSelectedFields(selectedFields.filter((f) => f.id !== id));
  };

  const handleFieldUsedAreaChange = (id: string, usedArea: number) => {
    setSelectedFields(
      selectedFields.map((f) => (f.id === id ? { ...f, usedArea } : f))
    );
  };

  return (
    <div className="min-h-screen w-full p-6">
      <FieldSelector
        selectedFields={selectedFields}
        onAddField={handleAddField}
        onRemoveField={handleRemoveField}
        onFieldUsedAreaChange={handleFieldUsedAreaChange}
      />

      <AreaVisualizer
        totalArea={totalArea}
        allocatedArea={totalUsedArea}
        fields={selectedFields}
      />
    </div>
  );
}
