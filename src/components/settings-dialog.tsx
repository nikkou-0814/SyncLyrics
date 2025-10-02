'use client';

import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon, Type, Music, LetterText, Clock, Blend, Palette, Layers, SlidersHorizontal, Expand, MoveHorizontal, MicVocal, ArrowUpWideNarrow, Spline, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SettingsSidebarProps } from '@/types';
import { Slider } from '@/components/ui/slider';
import { SiGithub } from 'react-icons/si';

type RgbaColor = { r: number; g: number; b: number; a: number };

const clamp = (n: number, min = 0, max = 255) => Math.min(Math.max(n, min), max);
const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase();
const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const parseColorToRgba = (input: string | undefined | null): RgbaColor => {
  if (!input || typeof input !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = input.trim();

  if (s.startsWith('#')) {
    const h = s.slice(1);
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b, a: 1 };
    }
    if (h.length === 4) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      const a = parseInt(h[3] + h[3], 16) / 255;
      return { r, g, b, a };
    }
    if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
    if (h.length === 8) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      const a = parseInt(h.slice(6, 8), 16) / 255;
      return { r, g, b, a };
    }
  }

  const rgbaMatch = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+)\s*)?\)$/i);
  if (rgbaMatch) {
    const r = clamp(parseFloat(rgbaMatch[1]), 0, 255);
    const g = clamp(parseFloat(rgbaMatch[2]), 0, 255);
    const b = clamp(parseFloat(rgbaMatch[3]), 0, 255);
    const a = rgbaMatch[4] !== undefined ? Math.min(Math.max(parseFloat(rgbaMatch[4]), 0), 1) : 1;
    return { r, g, b, a };
  }

  return { r: 0, g: 0, b: 0, a: 1 };
};

const combineHexAndAlphaToRgba = (hexBase: string, alphaPercent: number): string => {
  const h = hexBase.startsWith('#') ? hexBase.slice(1) : hexBase;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.min(Math.max(alphaPercent, 0), 100) / 100;
  const aStr = a.toFixed(3).replace(/\.?0+$/, '');
  return `rgba(${r}, ${g}, ${b}, ${aStr})`;
};

type ColorWithAlphaPickerProps = {
  label: string;
  value: string;
  onChange: (newColor: string) => void;
};

const ColorWithAlphaPicker: React.FC<ColorWithAlphaPickerProps> = ({ label, value, onChange }) => {
  const rgba = parseColorToRgba(value);
  const baseHex = rgbToHex(rgba.r, rgba.g, rgba.b);
  const alpha = Math.round((rgba.a ?? 1) * 100);

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="color"
        value={baseHex}
        onChange={(e) => {
          const newHex = e.target.value;
          onChange(combineHexAndAlphaToRgba(newHex, alpha));
        }}
      />
      <div className="pt-1 px-1">
        <Slider
          value={[alpha]}
          min={0}
          max={100}
          step={1}
          onValueChange={(values) => {
            const newAlpha = values[0];
            onChange(combineHexAndAlphaToRgba(baseHex, newAlpha));
          }}
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">透明</span>
          <span className="text-xs text-muted-foreground">{alpha}%</span>
          <span className="text-xs text-muted-foreground">不透明</span>
        </div>
      </div>
    </div>
  );
};

type ColorPickerProps = {
  label: string;
  value: string;
  onChange: (newColor: string) => void;
};

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const rgba = parseColorToRgba(value);
  const baseHex = rgbToHex(rgba.r, rgba.g, rgba.b);

  return (
    <div className="space-y-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="color"
        value={baseHex}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
    </div>
  );
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  showSettings,
  setShowSettings,
  settings,
  handleSettingChange,
  isMobile,
}) => {
  if (isMobile) {
    return (
      <MobileSettingsView
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        settings={settings}
        handleSettingChange={handleSettingChange}
      />
    );
  }

  // デスクトップ用
  return (
    <TooltipProvider>
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <SettingsIcon className="h-5 w-5" />
              設定
            </SheetTitle>
            <SheetDescription>
              表示設定とプレーヤー設定をカスタマイズできます
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span>表示設定</span>
              </TabsTrigger>
              <TabsTrigger value="player" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>プレーヤー設定</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="display" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">レイアウトと表示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fontSize" className="text-sm font-medium flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        フォントサイズ
                        {settings.useAMLL && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">AMLLがオンの場合は使用できません（自動調整されます）</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { value: 'small', label: '小' },
                          { value: 'medium', label: '中' },
                          { value: 'large', label: '大' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.fontSize === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSettingChange('fontSize', option.value as 'small' | 'medium' | 'large')}
                            className="flex-1"
                            disabled={settings.useAMLL}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="lyricposition" className="text-sm font-medium flex items-center gap-2">
                      <LetterText className="h-4 w-4" />
                        歌詞位置
                      </Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { value: 'left', label: '左' },
                          { value: 'center', label: '中央' },
                          { value: 'right', label: '右' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.lyricposition === option.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSettingChange('lyricposition', option.value as 'left' | 'center' | 'right')}
                            className="flex-1"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="lyricOffset" className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      歌詞タイミング調整（秒）
                    </Label>
                    <Input
                      id="lyricOffset"
                      type="number"
                      step="0.1"
                      value={settings.lyricOffset}
                      onChange={(e) => {
                        const newOffset = Number(e.target.value);
                        handleSettingChange('lyricOffset', newOffset);
                      }}
                      className="mt-1"
                    />
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        プラス値: 早く表示
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        マイナス値: 遅く表示
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useKaraokeLyric" className="text-sm font-medium flex items-center gap-2">
                      <MicVocal className="h-4 w-4" />
                      カラオケ風歌詞
                      {settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオンの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="useKaraokeLyric"
                      checked={settings.useKaraokeLyric}
                      onCheckedChange={(checked) => handleSettingChange('useKaraokeLyric', checked)}
                      disabled={settings.useAMLL}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      カラオケ風歌詞進行方向
                      {(!settings.useKaraokeLyric || settings.useAMLL) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                        <p className="max-w-xs">
                          {!settings.useKaraokeLyric && "カラオケ風歌詞がオフの場合は使用できません"}
                          {settings.useAMLL && "AMLLがオンの場合は使用できません"}
                        </p>
                        </TooltipContent>
                      </Tooltip>
                      )}
                    </Label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                      { value: 'rtl', label: '右→左' },
                      { value: 'ltr', label: '左→右' },
                      { value: 'btt', label: '下→上' },
                      { value: 'ttb', label: '上→下' },
                      ].map((option) => (
                      <Button
                        key={option.value}
                        variant={settings.lyricProgressDirection === option.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSettingChange('lyricProgressDirection', option.value as 'rtl' | 'ltr' | 'btt' | 'ttb')}
                        className="flex-1"
                        disabled={!settings.useKaraokeLyric || settings.useAMLL}
                      >
                        {option.label}
                      </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showPronunciation" className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      発音を表示
                    </Label>
                    <Switch
                      id="showPronunciation"
                      checked={settings.showPronunciation ?? false}
                      onCheckedChange={(checked) => handleSettingChange('showPronunciation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showTranslation" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      翻訳を表示
                    </Label>
                    <Switch
                      id="showTranslation"
                      checked={settings.showTranslation ?? false}
                      onCheckedChange={(checked) => handleSettingChange('showTranslation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useTTML" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TTML形式を使用
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">TTML形式の歌詞データが利用可能な場合に使用します</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Switch
                      id="useTTML"
                      checked={settings.useTTML}
                      onCheckedChange={(checked) => handleSettingChange('useTTML', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useWordTiming" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      単語単位の同期を使用
                      {!settings.useTTML && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">TTML形式がオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                      </Label>
                    <Switch
                      id="useWordTiming"
                      checked={settings.useWordTiming}
                      onCheckedChange={(checked) => handleSettingChange('useWordTiming', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useAMLL" className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      AMLLを使用
                      {!settings.useTTML && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">TTML形式がオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="useAMLL"
                      checked={settings.useAMLL}
                      onCheckedChange={(checked) => handleSettingChange('useAMLL', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllHidePassedLines" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      過去の歌詞行を非表示
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllHidePassedLines"
                      checked={settings.amllHidePassedLines ?? false}
                      onCheckedChange={(checked) => handleSettingChange('amllHidePassedLines', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex justify-end mt-2">
                    <a
                      href="https://github.com/Steve-xmh/applemusic-like-lyrics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline hover:text-primary flex items-center gap-2"
                    >
                      <SiGithub className="h-4 w-4" />
                      AMLL
                    </a>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="scrollPositionOffset" className="text-sm font-medium flex items-center gap-2">
                      <MoveHorizontal className="h-4 w-4 rotate-90" />
                      歌詞表示位置（上下）
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">画面上での歌詞の垂直位置を調整します</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="scrollPositionOffset"
                        defaultValue={[settings.scrollPositionOffset]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('scrollPositionOffset', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-sm text-muted-foreground">上部</span>
                      <span className="text-sm text-muted-foreground">中央</span>
                      <span className="text-sm text-muted-foreground">下部</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useCustomColors" className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      カスタムカラーを有効化
                    </Label>
                    <Switch
                      id="useCustomColors"
                      checked={settings.useCustomColors}
                      onCheckedChange={(checked) => handleSettingChange('useCustomColors', checked)}
                    />
                  </div>

                  {settings.useCustomColors && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          歌詞カラー
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <ColorWithAlphaPicker
                            label="アクティブ"
                            value={settings.activeLyricColor}
                            onChange={(v) => handleSettingChange('activeLyricColor', v)}
                          />
                          <ColorWithAlphaPicker
                            label="非アクティブ"
                            value={settings.inactiveLyricColor}
                            onChange={(v) => handleSettingChange('inactiveLyricColor', v)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          間奏の色
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                          <ColorPicker
                            label=""
                            value={settings.interludeDotsColor}
                            onChange={(v) => handleSettingChange('interludeDotsColor', v)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">視覚効果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="backgroundblur" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      背景ぼかし
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundblur"
                        defaultValue={[settings.backgroundblur]}
                        min={0}
                        max={20}
                        step={1}
                        onValueChange={(values) => handleSettingChange('backgroundblur', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">なし</span>
                      <span className="text-xs text-muted-foreground">強</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="backgroundtransparency" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      背景透明度
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundtransparency"
                        defaultValue={[settings.backgroundtransparency]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('backgroundtransparency', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">透明</span>
                      <span className="text-xs text-muted-foreground">不透明</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      テーマ
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: 'dark', label: 'ダーク' },
                        { value: 'light', label: 'ライト' },
                        { value: 'system', label: 'システム' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.theme === option.value ? "default" : "outline"}
                          onClick={() =>
                            handleSettingChange('theme', option.value as 'dark' | 'light' | 'system')
                          }
                          className="flex-1"
                          size="sm"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableSpring" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      スプリングアニメーション
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableSpring"
                      checked={settings.amllEnableSpring ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableSpring', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableBlur" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      ブラーエフェクト
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableBlur"
                      checked={settings.amllEnableBlur ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableBlur', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableScale" className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      スケールエフェクト
                      {!settings.useAMLL && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">AMLLがオフの場合は使用できません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <Switch
                      id="amllEnableScale"
                      checked={settings.amllEnableScale ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableScale', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      カスタムイージング
                    </Label>
                    <Input
                      id="scrollEasing"
                      type="text"
                      value={settings.CustomEasing}
                      onChange={(e) => handleSettingChange('CustomEasing', e.target.value)}
                      placeholder="例: cubic-bezier(0.22, 1, 0.36, 1)"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="player" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">プレーヤー設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showplayercontrol" className="text-sm font-medium flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      プレーヤーコントロールを表示
                    </Label>
                    <Switch
                      id="showplayercontrol"
                      checked={settings.showplayercontrol}
                      onCheckedChange={(checked) => handleSettingChange('showplayercontrol', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="fullplayer" className="text-sm font-medium flex items-center gap-2">
                      <Expand className="h-4 w-4" />
                      フルプレーヤー
                    </Label>
                    <Switch
                      id="fullplayer"
                      checked={settings.fullplayer}
                      onCheckedChange={(checked) => handleSettingChange('fullplayer', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="playerposition" className="text-sm font-medium flex items-center gap-2">
                      <MoveHorizontal className="h-4 w-4" />
                      プレーヤー位置
                      {settings.fullplayer && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full">?</Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">フルプレーヤーモードでは位置の変更ができません</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </Label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { value: 'left', label: '左' },
                        { value: 'center', label: '中央' },
                        { value: 'right', label: '右' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.playerposition === option.value ? "default" : "outline"}
                          onClick={() =>
                            !settings.fullplayer && 
                            handleSettingChange('playerposition', option.value as 'left' | 'center' | 'right')
                          }
                          className="flex-1"
                          disabled={settings.fullplayer}
                          size="sm"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};

// モバイル用
const MobileSettingsView: React.FC<Omit<SettingsSidebarProps, 'isMobile'>> = ({
  showSettings,
  setShowSettings,
  settings,
  handleSettingChange,
}) => {
  return (
    <Sheet open={showSettings} onOpenChange={setShowSettings}>
      <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] pb-8 rounded-t-xl">
        <div className="absolute top-0 left-0 right-0 flex justify-center py-2">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>
        <SheetTitle className="flex items-center gap-2 text-xl">
          <SettingsIcon className="h-5 w-5" />
          設定
        </SheetTitle>
        
        <div className="overflow-y-auto h-full pb-8">
          <Tabs defaultValue="display" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 sticky top-0 z-10 bg-background rounded-none">
              <TabsTrigger value="display" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                <span>表示設定</span>
              </TabsTrigger>
              <TabsTrigger value="player" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                <span>プレーヤー設定</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="display" className="space-y-4 pb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">レイアウトと表示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="fontSize" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Type className="h-4 w-4" />
                        フォントサイズ
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'small', label: '小' },
                          { value: 'medium', label: '中' },
                          { value: 'large', label: '大' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.fontSize === option.value ? "default" : "outline"}
                            onClick={() => handleSettingChange('fontSize', option.value as 'small' | 'medium' | 'large')}
                            className="w-full py-3"
                            disabled={settings.useAMLL}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      {settings.useAMLL && (
                        <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                          AMLLがオンの場合は使用できません（自動調整されます）
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="lyricposition" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <LetterText className="h-4 w-4" />
                        歌詞位置
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'left', label: '左' },
                          { value: 'center', label: '中央' },
                          { value: 'right', label: '右' }
                        ].map((option) => (
                          <Button
                            key={option.value}
                            variant={settings.lyricposition === option.value ? "default" : "outline"}
                            onClick={() => handleSettingChange('lyricposition', option.value as 'left' | 'center' | 'right')}
                            className="w-full py-3"
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="lyricOffset" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4" />
                        歌詞タイミング調整（秒）
                      </Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOffset = Number((settings.lyricOffset - 0.1).toFixed(1));
                            handleSettingChange('lyricOffset', newOffset);
                          }}
                          className="px-3 py-2 text-lg font-semibold"
                        >
                          -
                        </Button>
                        <Input
                          id="lyricOffset"
                          type="number"
                          step="0.1"
                          value={settings.lyricOffset}
                          onChange={(e) => {
                            const newOffset = Number(e.target.value);
                            handleSettingChange('lyricOffset', newOffset);
                          }}
                          className="flex-1 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOffset = Number((settings.lyricOffset + 0.1).toFixed(1));
                            handleSettingChange('lyricOffset', newOffset);
                          }}
                          className="px-3 py-2 text-lg font-semibold"
                        >
                          +
                        </Button>
                      </div>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          プラス値: 早く表示
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          マイナス値: 遅く表示
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useKaraokeLyric" className="text-sm font-medium flex items-center gap-2">
                      <MicVocal className="h-4 w-4" />
                      カラオケ風歌詞
                    </Label>
                    <Switch
                      id="useKaraokeLyric"
                      checked={settings.useKaraokeLyric}
                      onCheckedChange={(checked) => handleSettingChange('useKaraokeLyric', checked)}
                      disabled={settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオンの場合は使用できません
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      カラオケ風歌詞進行方向
                    </Label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { value: 'rtl', label: '右→左' },
                        { value: 'ltr', label: '左→右' },
                        { value: 'btt', label: '下→上' },
                        { value: 'ttb', label: '上→下' },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.lyricProgressDirection === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('lyricProgressDirection', option.value as 'rtl' | 'ltr' | 'btt' | 'ttb')}
                          className="w-full py-3"
                          disabled={!settings.useKaraokeLyric || settings.useAMLL}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    {(!settings.useKaraokeLyric || settings.useAMLL) && (
                      <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      {!settings.useKaraokeLyric && "カラオケ風歌詞がオフの場合は使用できません"}
                      {settings.useAMLL && "AMLLがオンの場合は使用できません"}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showPronunciation" className="text-sm font-medium flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      発音を表示
                    </Label>
                    <Switch
                      id="showPronunciation"
                      checked={settings.showPronunciation ?? false}
                      onCheckedChange={(checked) => handleSettingChange('showPronunciation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showTranslation" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      翻訳を表示
                    </Label>
                    <Switch
                      id="showTranslation"
                      checked={settings.showTranslation ?? false}
                      onCheckedChange={(checked) => handleSettingChange('showTranslation', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useTTML" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TTML形式を使用
                    </Label>
                    <Switch
                      id="useTTML"
                      checked={settings.useTTML}
                      onCheckedChange={(checked) => handleSettingChange('useTTML', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useWordTiming" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      単語単位の同期を使用
                    </Label>
                    <Switch
                      id="useWordTiming"
                      checked={settings.useWordTiming}
                      onCheckedChange={(checked) => handleSettingChange('useWordTiming', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>
                  {!settings.useTTML && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      TTML形式がオフの場合は使用できません
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useAMLL" className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      AMLLを使用
                    </Label>
                    <Switch
                      id="useAMLL"
                      checked={settings.useAMLL}
                      onCheckedChange={(checked) => handleSettingChange('useAMLL', checked)}
                      disabled={!settings.useTTML}
                    />
                  </div>
                  {!settings.useTTML && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      TTML形式がオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllHidePassedLines" className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      過去の歌詞行を非表示
                    </Label>
                    <Switch
                      id="amllHidePassedLines"
                      checked={settings.amllHidePassedLines ?? false}
                      onCheckedChange={(checked) => handleSettingChange('amllHidePassedLines', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex justify-end mt-2">
                    <a
                      href="https://github.com/Steve-xmh/applemusic-like-lyrics"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:underline hover:text-primary flex items-center gap-2"
                    >
                      <SiGithub className="h-4 w-4" />
                      AMLL
                    </a>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                      <Label htmlFor="scrollPositionOffset" className="text-sm font-medium flex items-center gap-2 mb-2">
                        <MoveHorizontal className="h-4 w-4 rotate-90" />
                        歌詞表示位置（上下）
                      </Label>
                      <div className="text-sm text-muted-foreground bg-secondary p-2 rounded mb-2">
                        画面上での歌詞の垂直位置を調整します
                      </div>
                      <div className="pt-4 px-2">
                        <Slider
                          id="scrollPositionOffset"
                          defaultValue={[settings.scrollPositionOffset]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(values) => handleSettingChange('scrollPositionOffset', values[0])}
                        />
                      </div>
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">上部</span>
                        <span className="text-sm text-muted-foreground">中央</span>
                        <span className="text-sm text-muted-foreground">下部</span>
                      </div>
                    </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="useCustomColors" className="text-sm font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      カスタムカラーを有効化
                    </Label>
                    <Switch
                      id="useCustomColors"
                      checked={settings.useCustomColors}
                      onCheckedChange={(checked) => handleSettingChange('useCustomColors', checked)}
                    />
                  </div>

                  {settings.useCustomColors && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          歌詞カラー
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <ColorWithAlphaPicker
                            label="アクティブ"
                            value={settings.activeLyricColor}
                            onChange={(v) => handleSettingChange('activeLyricColor', v)}
                          />
                          <ColorWithAlphaPicker
                            label="非アクティブ"
                            value={settings.inactiveLyricColor}
                            onChange={(v) => handleSettingChange('inactiveLyricColor', v)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          間奏の色
                        </Label>
                        <div className="grid grid-cols-1 gap-3">
                          <ColorPicker
                            label=""
                            value={settings.interludeDotsColor}
                            onChange={(v) => handleSettingChange('interludeDotsColor', v)}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">視覚効果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="backgroundblur" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      背景ぼかし
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundblur"
                        defaultValue={[settings.backgroundblur]}
                        min={0}
                        max={20}
                        step={1}
                        onValueChange={(values) => handleSettingChange('backgroundblur', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">なし</span>
                      <span className="text-xs text-muted-foreground">強</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="backgroundtransparency" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      背景透明度
                    </Label>
                    <div className="pt-4 px-2">
                      <Slider
                        id="backgroundtransparency"
                        defaultValue={[settings.backgroundtransparency]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(values) => handleSettingChange('backgroundtransparency', values[0])}
                      />
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-xs text-muted-foreground">透明</span>
                      <span className="text-xs text-muted-foreground">不透明</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="theme" className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      テーマ
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'dark', label: 'ダーク' },
                        { value: 'light', label: 'ライト' },
                        { value: 'system', label: 'システム' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.theme === option.value ? "default" : "outline"}
                          onClick={() => handleSettingChange('theme', option.value as 'dark' | 'light' | 'system')}
                          className="w-full py-3"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableSpring" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      スプリングアニメーション
                    </Label>
                    <Switch
                      id="amllEnableSpring"
                      checked={settings.amllEnableSpring ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableSpring', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableBlur" className="text-sm font-medium flex items-center gap-2">
                      <Blend className="h-4 w-4" />
                      ブラーエフェクト
                    </Label>
                    <Switch
                      id="amllEnableBlur"
                      checked={settings.amllEnableBlur ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableBlur', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="amllEnableScale" className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpWideNarrow className="h-4 w-4" />
                      スケールエフェクト
                    </Label>
                    <Switch
                      id="amllEnableScale"
                      checked={settings.amllEnableScale ?? true}
                      onCheckedChange={(checked) => handleSettingChange('amllEnableScale', checked)}
                      disabled={!settings.useAMLL}
                    />
                  </div>
                  {!settings.useAMLL && (
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      AMLLがオフの場合は使用できません
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="theme" className="text-sm font-medium flex items-center gap-2">
                      <Spline className="h-4 w-4" />
                      カスタムイージング
                    </Label>
                    <Input
                      id="scrollEasing"
                      type="text"
                      value={settings.CustomEasing}
                      onChange={(e) => handleSettingChange('CustomEasing', e.target.value)}
                      placeholder="例: cubic-bezier(0.22, 1, 0.36, 1)"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="player" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-md">プレーヤー設定</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="showplayercontrol" className="text-sm font-medium flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      プレーヤーコントロールを表示
                    </Label>
                    <Switch
                      id="showplayercontrol"
                      checked={settings.showplayercontrol}
                      onCheckedChange={(checked) => handleSettingChange('showplayercontrol', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between py-2">
                    <Label htmlFor="fullplayer" className="text-sm font-medium flex items-center gap-2">
                      <Expand className="h-4 w-4" />
                      フルプレーヤー
                    </Label>
                    <Switch
                      id="fullplayer"
                      checked={true}
                      disabled={true}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                    モバイルデバイスではフルプレーヤーのみ対応しています
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="playerposition" className="text-sm font-medium flex items-center gap-2 mb-2">
                      <MoveHorizontal className="h-4 w-4" />
                      プレーヤー位置
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'left', label: '左' },
                        { value: 'center', label: '中央' },
                        { value: 'right', label: '右' }
                      ].map((option) => (
                        <Button
                          key={option.value}
                          variant={settings.playerposition === option.value ? "default" : "outline"}
                          className="w-full py-3"
                          disabled
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                    <div className="text-sm text-muted-foreground bg-secondary p-2 rounded">
                      フルプレーヤーモードでは位置の変更ができません
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SettingsSidebar;
