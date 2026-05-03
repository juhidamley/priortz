import { useState } from 'react';
import { Check, Pipette } from 'lucide-react';
import { COLOR_PALETTES } from '../constants';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ColorPickerProps {
  selectedColor?: string;
  onColorSelect: (color: string) => void;
  label?: string;
}

export function ColorPicker({ selectedColor, onColorSelect, label = 'Color' }: ColorPickerProps) {
  const [activePalette, setActivePalette] = useState<keyof typeof COLOR_PALETTES>('vibrant');
  const [customColor, setCustomColor] = useState(selectedColor || '#3b82f6');

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorSelect(value);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Custom Color Picker */}
      <div className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 flex-1">
          <Pipette className="w-4 h-4 text-gray-500" />
          <Input
            type="text"
            value={selectedColor || customColor}
            onChange={(e) => handleCustomColorChange(e.target.value)}
            placeholder="#3b82f6"
            className="flex-1 font-mono text-sm"
            maxLength={7}
          />
          <input
            type="color"
            value={selectedColor || customColor}
            onChange={(e) => onColorSelect(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border-2 border-gray-200"
          />
        </div>
      </div>

      {/* Preset Palettes */}
      <Tabs value={activePalette} onValueChange={(value) => setActivePalette(value as keyof typeof COLOR_PALETTES)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vibrant" className="text-xs">Vibrant</TabsTrigger>
          <TabsTrigger value="pastel" className="text-xs">Pastel</TabsTrigger>
          <TabsTrigger value="muted" className="text-xs">Muted</TabsTrigger>
          <TabsTrigger value="neutral" className="text-xs">Neutral</TabsTrigger>
        </TabsList>
        {Object.entries(COLOR_PALETTES).map(([paletteKey, colors]) => (
          <TabsContent key={paletteKey} value={paletteKey} className="mt-3">
            <div className="grid grid-cols-8 gap-2">
              {colors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`relative w-8 h-8 rounded-lg transition-transform hover:scale-110 ${
                    selectedColor === color.value ? 'scale-110 ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => onColorSelect(color.value)}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <Check className="w-4 h-4 absolute inset-0 m-auto text-white drop-shadow" />
                  )}
                </button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      {selectedColor && (
        <button
          type="button"
          onClick={() => onColorSelect('')}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Clear color
        </button>
      )}
    </div>
  );
}