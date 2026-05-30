// @ts-nocheck
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Monitor,
  Moon,
  Sun,
  Type,
  Zap,
  ZapOff,
  LayoutList,
  ChevronRight,
  Sparkles,
  Check,
  BarChart3,
  TrendingUp,
  Eye,
  Palette,
} from 'lucide-react'
import {
  useTheme,
  ACCENT_COLORS,
  THEME_OPTIONS,
  DENSITY_OPTIONS,
} from '../hooks/useTheme'
import { Link } from 'react-router-dom'
import SEO from '../components/SEO';

/* ═══════════════════════════════════════════════
   Appearance Settings Page
   ═══════════════════════════════════════════════ */
export default function Appearance() {
  const {
    theme,
    setTheme,
    resolvedTheme,
    accentColor,
    setAccentColor,
    fontSize,
    setFontSize,
    reducedMotion,
    setReducedMotion,
    density,
    setDensity,
  } = useTheme()

  const [activeSection, setActiveSection] = useState<string | null>(null)

  const pageBg = resolvedTheme === 'dark' ? 'bg-[#050505]' : 'bg-[#f5f5f5]'
  const cardBg = resolvedTheme === 'dark' ? 'bg-[#111111]' : 'bg-white'
  const textPrimary = resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
  const textSecondary = resolvedTheme === 'dark' ? 'text-[#8A8F98]' : 'text-gray-500'
  const textTertiary = resolvedTheme === 'dark' ? 'text-[#555B66]' : 'text-gray-400'
  const borderSubtle = resolvedTheme === 'dark' ? 'border-white/[0.06]' : 'border-gray-200'
  const hoverBg = resolvedTheme === 'dark' ? 'hover:bg-white/[0.04]' : 'hover:bg-gray-50'
  const inputBg = resolvedTheme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-100'
  const previewCardBg = resolvedTheme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'

  const sectionAnim = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.95] },
  }

  return (
    <>
    <SEO
      title="Appearance"
      description="Customize your AdNexus AI workspace appearance. Choose themes, adjust layouts, and personalize your dashboard experience."
      keywords="appearance, theme, customization, dark mode, workspace settings"
    />
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* ── Header ── */}
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
        <div className="flex items-center gap-2 text-sm mb-6">
          <Link
            to="/settings"
            className={`${textSecondary} ${hoverBg} px-2 py-1 rounded-md transition-colors`}
          >
            Settings
          </Link>
          <ChevronRight className={`w-3.5 h-3.5 ${textTertiary}`} />
          <span className={textSecondary}>Appearance</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <h1 className={`text-3xl font-semibold ${textPrimary} tracking-tight`}>
            Appearance
          </h1>
          <p className={`${textSecondary} mt-1.5 text-[15px]`}>
            Customize how AdNexus looks and feels
          </p>
        </motion.div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* ══════════════ Main Settings ══════════════ */}
          <div className="flex-1 space-y-5">
            {/* ── Theme Selection ── */}
            <motion.section
              {...sectionAnim}
              className={`${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className="p-5 border-b ${borderSubtle}">
                <div className="flex items-center gap-2.5">
                  <Monitor className={`w-4.5 h-4.5 ${textSecondary}`} />
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Theme</h2>
                </div>
                <p className={`${textSecondary} text-sm mt-1 ml-7`}>
                  Choose your preferred color scheme
                </p>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((option) => (
                  <ThemeCard
                    key={option.value}
                    option={option}
                    isSelected={theme === option.value}
                    onClick={() => setTheme(option.value)}
                    resolvedTheme={resolvedTheme}
                  />
                ))}
              </div>
            </motion.section>

            {/* ── Accent Color ── */}
            <motion.section
              {...sectionAnim}
              transition={{ ...sectionAnim.transition, delay: 0.05 }}
              className={`${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className="p-5 border-b ${borderSubtle}">
                <div className="flex items-center gap-2.5">
                  <Palette className={`w-4.5 h-4.5 ${textSecondary}`} />
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Accent Color</h2>
                </div>
                <p className={`${textSecondary} text-sm mt-1 ml-7`}>
                  Pick a color that matches your style
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`group relative w-12 h-12 rounded-full transition-all duration-200 ${
                        accentColor === color.value
                          ? 'ring-2 ring-offset-2 scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: color.value,
                        ringColor: accentColor === color.value ? color.value : undefined,
                        '--tw-ring-offset-color': resolvedTheme === 'dark' ? '#111' : '#fff',
                      } as React.CSSProperties}
                      title={color.name}
                      aria-label={`Select ${color.name} accent color`}
                      aria-pressed={accentColor === color.value}
                    >
                      {accentColor === color.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check
                            className={`w-5 h-5 ${
                              color.name === 'Lime' ? 'text-black' : 'text-white'
                            }`}
                            strokeWidth={3}
                          />
                        </motion.div>
                      )}
                      <span
                        className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium ${textSecondary} opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}
                      >
                        {color.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={`mt-8 h-1.5 rounded-full overflow-hidden ${inputBg}`}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((parseInt(ACCENT_COLORS.find(c => c.value === accentColor)?.hue || '75') / 360) * 100)}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>
              </div>
            </motion.section>

            {/* ── Font Size ── */}
            <motion.section
              {...sectionAnim}
              transition={{ ...sectionAnim.transition, delay: 0.1 }}
              className={`${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className="p-5 border-b ${borderSubtle}">
                <div className="flex items-center gap-2.5">
                  <Type className={`w-4.5 h-4.5 ${textSecondary}`} />
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Font Size</h2>
                </div>
                <p className={`${textSecondary} text-sm mt-1 ml-7`}>
                  Adjust the base text size across the interface
                </p>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-4">
                  <span className={`text-xs ${textTertiary} font-mono`}>12px</span>
                  <input
                    type="range"
                    min={12}
                    max={18}
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="flex-1 accent-slider"
                    style={{ '--accent-color': accentColor } as React.CSSProperties}
                    aria-label="Font size"
                  />
                  <span className={`text-xs ${textTertiary} font-mono`}>18px</span>
                </div>
                <div className="flex justify-between mt-3">
                  <span className={`text-sm ${textSecondary}`}>Current: <strong className={textPrimary}>{fontSize}px</strong></span>
                </div>
              </div>
            </motion.section>

            {/* ── Animation Speed ── */}
            <motion.section
              {...sectionAnim}
              transition={{ ...sectionAnim.transition, delay: 0.15 }}
              className={`${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className="p-5 border-b ${borderSubtle}">
                <div className="flex items-center gap-2.5">
                  <Zap className={`w-4.5 h-4.5 ${textSecondary}`} />
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Animations</h2>
                </div>
                <p className={`${textSecondary} text-sm mt-1 ml-7`}>
                  Control motion and transitions
                </p>
              </div>
              <div className="p-5">
                <button
                  onClick={() => setReducedMotion(!reducedMotion)}
                  className={`flex items-center justify-between w-full p-4 rounded-lg border ${borderSubtle} ${hoverBg} transition-all duration-200`}
                  aria-pressed={reducedMotion}
                >
                  <div className="flex items-center gap-3">
                    {reducedMotion ? (
                      <ZapOff className={`w-5 h-5 ${textSecondary}`} />
                    ) : (
                      <Zap className="w-5 h-5" style={{ color: accentColor }} />
                    )}
                    <div className="text-left">
                      <span className={`text-sm font-medium ${textPrimary}`}>
                        Reduced motion
                      </span>
                      <p className={`text-xs ${textSecondary} mt-0.5`}>
                        Minimize animations for accessibility
                      </p>
                    </div>
                  </div>
                  <ToggleSwitch
                    enabled={reducedMotion}
                    accentColor={accentColor}
                    resolvedTheme={resolvedTheme}
                  />
                </button>
              </div>
            </motion.section>

            {/* ── Density ── */}
            <motion.section
              {...sectionAnim}
              transition={{ ...sectionAnim.transition, delay: 0.2 }}
              className={`${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className="p-5 border-b ${borderSubtle}">
                <div className="flex items-center gap-2.5">
                  <LayoutList className={`w-4.5 h-4.5 ${textSecondary}`} />
                  <h2 className={`text-sm font-medium ${textPrimary}`}>Density</h2>
                </div>
                <p className={`${textSecondary} text-sm mt-1 ml-7`}>
                  Control spacing and compactness
                </p>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {DENSITY_OPTIONS.map((option) => (
                  <DensityCard
                    key={option.value}
                    option={option}
                    isSelected={density === option.value}
                    onClick={() => setDensity(option.value)}
                    resolvedTheme={resolvedTheme}
                    accentColor={accentColor}
                  />
                ))}
              </div>
            </motion.section>
          </div>

          {/* ══════════════ Preview Panel ══════════════ */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:w-80 xl:w-96 flex-shrink-0"
          >
            <div
              className={`sticky top-6 ${cardBg} border ${borderSubtle} rounded-xl overflow-hidden transition-colors duration-300`}
            >
              <div className={`p-4 border-b ${borderSubtle} flex items-center gap-2`}>
                <Eye className={`w-4 h-4 ${textSecondary}`} />
                <h3 className={`text-sm font-medium ${textPrimary}`}>Live Preview</h3>
                <span
                  className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    backgroundColor: hexToRgba(accentColor, 0.12),
                    color: accentColor,
                  }}
                >
                  {resolvedTheme}
                </span>
              </div>

              <div className={`p-5 ${previewCardBg} transition-colors duration-300`}>
                {/* Mini dashboard preview */}
                <div
                  className={`rounded-lg border ${borderSubtle} overflow-hidden transition-colors duration-300`}
                  style={{ backgroundColor: resolvedTheme === 'dark' ? '#111' : '#fff' }}
                >
                  {/* Preview header */}
                  <div
                    className={`px-3 py-2.5 flex items-center gap-2 border-b ${borderSubtle}`}
                    style={{ backgroundColor: resolvedTheme === 'dark' ? '#161616' : '#fafafa' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div
                      className={`h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}
                      style={{ width: '40%' }}
                    />
                    <div className="ml-auto flex gap-1">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/20' : 'bg-gray-300'}`}
                      />
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/20' : 'bg-gray-300'}`}
                      />
                    </div>
                  </div>

                  {/* Preview stats */}
                  <div className="p-3 space-y-2.5">
                    {/* Stat row 1 */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: hexToRgba(accentColor, 0.12) }}
                      >
                        <BarChart3
                          className="w-4 h-4"
                          style={{ color: accentColor }}
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          className={`h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}
                          style={{ width: '60%' }}
                        />
                        <div
                          className={`h-1.5 rounded-full mt-1.5 ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
                          style={{ width: '40%' }}
                        />
                      </div>
                      <TrendingUp
                        className="w-4 h-4"
                        style={{ color: accentColor }}
                      />
                    </div>

                    {/* Divider */}
                    <div className={`h-px ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`} />

                    {/* Stat row 2 */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: hexToRgba(accentColor, 0.12) }}
                      >
                        <Sparkles
                          className="w-4 h-4"
                          style={{ color: accentColor }}
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          className={`h-2 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}
                          style={{ width: '45%' }}
                        />
                        <div
                          className={`h-1.5 rounded-full mt-1.5 ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
                          style={{ width: '30%' }}
                        />
                      </div>
                    </div>

                    {/* Mini progress bars */}
                    <div className="pt-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-1.5 flex-1 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: '72%',
                              backgroundColor: accentColor,
                            }}
                          />
                        </div>
                        <span
                          className={`text-[10px] ${textTertiary} font-mono`}
                          style={{ fontSize: `${Math.max(10, fontSize - 3)}px` }}
                        >
                          72%
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-1.5 flex-1 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: '45%',
                              backgroundColor: accentColor,
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span
                          className={`text-[10px] ${textTertiary} font-mono`}
                          style={{ fontSize: `${Math.max(10, fontSize - 3)}px` }}
                        >
                          45%
                        </span>
                      </div>
                    </div>

                    {/* Mini button preview */}
                    <div className="pt-1 flex gap-2">
                      <div
                        className="flex-1 h-7 rounded-md flex items-center justify-center"
                        style={{ backgroundColor: accentColor }}
                      >
                        <div
                          className={`h-1.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-black/20' : 'bg-white/30'}`}
                          style={{ width: '50%' }}
                        />
                      </div>
                      <div
                        className={`flex-1 h-7 rounded-md flex items-center justify-center border ${borderSubtle}`}
                      >
                        <div
                          className={`h-1.5 rounded-full ${resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-gray-200'}`}
                          style={{ width: '40%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Density preview indicator */}
                <div className={`mt-4 p-3 rounded-lg border ${borderSubtle}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${textSecondary}`}>Density preview</span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: accentColor }}
                    >
                      {density}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 ${density === 'compact' ? 'py-0.5' : density === 'comfortable' ? 'py-2' : 'py-1.5'}`}
                        style={{ transition: 'padding 0.3s ease' }}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: accentColor, opacity: 0.6 + i * 0.15 }}
                        />
                        <div
                          className={`h-1.5 rounded-full flex-1 ${resolvedTheme === 'dark' ? 'bg-white/8' : 'bg-gray-100'}`}
                          style={{ width: `${70 - i * 10}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Animation preview */}
                <div className={`mt-4 p-3 rounded-lg border ${borderSubtle}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${textSecondary}`}>Animation preview</span>
                    {reducedMotion ? (
                      <span className={`text-xs ${textTertiary}`}>Off</span>
                    ) : (
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: accentColor }}
                      />
                    )}
                  </div>
                  {!reducedMotion && (
                    <motion.div
                      className={`mt-2 h-1 rounded-full overflow-hidden ${resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: accentColor }}
                        animate={{ width: ['0%', '100%', '0%'] }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: 'easeInOut',
                        }}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Current settings summary */}
                <div className={`mt-4 pt-4 border-t ${borderSubtle}`}>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className={textTertiary}>Theme</span>
                      <p className={`font-medium ${textPrimary} capitalize`}>{theme}</p>
                    </div>
                    <div>
                      <span className={textTertiary}>Font</span>
                      <p className={`font-medium ${textPrimary}`}>{fontSize}px</p>
                    </div>
                    <div>
                      <span className={textTertiary}>Motion</span>
                      <p className={`font-medium ${textPrimary}`}>
                        {reducedMotion ? 'Reduced' : 'Full'}
                      </p>
                    </div>
                    <div>
                      <span className={textTertiary}>Spacing</span>
                      <p className={`font-medium ${textPrimary} capitalize`}>{density}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════ */

function ThemeCard({
  option,
  isSelected,
  onClick,
  resolvedTheme,
}: {
  option: (typeof THEME_OPTIONS)[number]
  isSelected: boolean
  onClick: () => void
  resolvedTheme: 'dark' | 'light'
}) {
  const { accentColor } = useTheme()
  const isDark = option.value === 'dark' || (option.value === 'system' && resolvedTheme === 'dark')

  const cardBg = isDark ? 'bg-[#111]' : 'bg-[#f8f8f8]'
  const headerBg = isDark ? 'bg-[#0a0a0a]' : 'bg-white'
  const textMain = isDark ? 'text-white' : 'text-gray-900'
  const textMuted = isDark ? 'text-[#555B66]' : 'text-gray-400'
  const borderCol = isDark ? 'border-white/[0.06]' : 'border-gray-200'

  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg border-2 overflow-hidden transition-all duration-200 text-left ${
        isSelected ? '' : 'border-transparent hover:opacity-80'
      }`}
      style={{
        borderColor: isSelected ? useTheme().accentColor : undefined,
      }}
      aria-pressed={isSelected}
    >
      {/* Mini thumbnail */}
      <div className={`h-20 ${cardBg} p-2.5 transition-colors duration-300`}>
        <div className={`h-full rounded-md ${headerBg} border ${borderCol} p-2 space-y-1.5`}>
          <div className="flex gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isDark ? '#c3f53b' : '#3B82F6' }}
            />
            <div className={`w-6 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          </div>
          <div className={`h-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} style={{ width: '60%' }} />
          <div className={`h-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`} style={{ width: '40%' }} />
        </div>
      </div>

      {/* Label */}
      <div className={`px-3 py-2.5 ${cardBg} border-t ${borderCol}`}>
        <div className="flex items-center gap-2">
          {option.value === 'dark' && <Moon className="w-3.5 h-3.5" style={{ color: isDark ? '#fff' : '#555' }} />}
          {option.value === 'light' && <Sun className="w-3.5 h-3.5" style={{ color: isDark ? '#fff' : '#555' }} />}
          {option.value === 'system' && <Monitor className="w-3.5 h-3.5" style={{ color: isDark ? '#fff' : '#555' }} />}
          <span className={`text-sm font-medium ${textMain}`}>{option.label}</span>
        </div>
        <p className={`text-[11px] ${textMuted} mt-0.5 ml-5.5`}>{option.description}</p>
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
        >
          <Check className="w-3 h-3 text-black" strokeWidth={3} />
        </motion.div>
      )}
    </button>
  )
}

function DensityCard({
  option,
  isSelected,
  onClick,
  resolvedTheme,
  accentColor,
}: {
  option: (typeof DENSITY_OPTIONS)[number]
  isSelected: boolean
  onClick: () => void
  resolvedTheme: 'dark' | 'light'
  accentColor: string
}) {
  const textMain = resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
  const textMuted = resolvedTheme === 'dark' ? 'text-[#555B66]' : 'text-gray-400'
  const itemCount = option.value === 'compact' ? 4 : option.value === 'comfortable' ? 2 : 3
  const itemPadding = option.value === 'compact' ? 'py-0.5' : option.value === 'comfortable' ? 'py-2' : 'py-1'

  return (
    <button
      onClick={onClick}
      className={`relative rounded-lg border-2 p-3 text-left transition-all duration-200 ${
        isSelected ? '' : 'border-transparent hover:opacity-80'
      } ${resolvedTheme === 'dark' ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}
      style={{
        borderColor: isSelected ? accentColor : undefined,
      }}
      aria-pressed={isSelected}
    >
      {/* Visual density indicator */}
      <div className="space-y-0.5 mb-2.5">
        {Array.from({ length: itemCount }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-1.5 ${itemPadding} transition-all duration-300`}
          >
            <div
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{
                backgroundColor: accentColor,
                opacity: 0.4 + i * 0.15,
              }}
            />
            <div
              className={`h-1 rounded-full flex-1 ${resolvedTheme === 'dark' ? 'bg-white/8' : 'bg-gray-200'}`}
            />
          </div>
        ))}
      </div>

      <p className={`text-sm font-medium ${textMain}`}>{option.label}</p>
      <p className={`text-[11px] ${textMuted} mt-0.5`}>{option.description}</p>

      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accentColor }}
        >
          <Check className="w-3 h-3 text-black" strokeWidth={3} />
        </motion.div>
      )}
    </button>
  )
}

function ToggleSwitch({
  enabled,
  accentColor,
  resolvedTheme,
}: {
  enabled: boolean
  accentColor: string
  resolvedTheme: 'dark' | 'light'
}) {
  return (
    <div
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled ? '' : resolvedTheme === 'dark' ? 'bg-white/10' : 'bg-gray-300'
      }`}
      style={{ backgroundColor: enabled ? accentColor : undefined }}
    >
      <motion.div
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-md"
        style={{ backgroundColor: resolvedTheme === 'dark' ? '#fff' : '#fff' }}
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </div>
  )
}

// Helper
function hexToRgba(hex: string, alpha: number): string {
  const sanitized = hex.replace('#', '')
  const bigint = parseInt(sanitized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r},${g},${b},${alpha})`
}
