(function() {
  function getTheme() {
    const stored = localStorage.getItem('navo-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  const theme = getTheme();
  document.documentElement.classList.add(theme);
  
  // Apply custom theme config immediately
  const themeConfig = localStorage.getItem('navo-theme-config');
  if (themeConfig) {
    try {
      let config = JSON.parse(themeConfig);
      
      // Migrate old format to new format if needed
      if (config.primaryColor && !config.light) {
        config = {
          light: {
            primaryColor: config.primaryColor,
            hoverBorderColor: config.hoverBorderColor || config.primaryColor,
          },
          dark: {
            primaryColor: config.primaryColor,
            hoverBorderColor: config.hoverBorderColor || config.primaryColor,
          },
          glowIntensity: config.glowIntensity || 30,
        };
        localStorage.setItem('navo-theme-config', JSON.stringify(config));
      }
      
      function hexToHSL(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
      }
      
      function applyThemeColors(config) {
        const isDark = document.documentElement.classList.contains('dark');
        const themeColors = isDark ? config.dark : config.light;
        
        const hsl = hexToHSL(themeColors.primaryColor);
        if (hsl) {
          document.documentElement.style.setProperty('--primary', hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%');
          document.documentElement.style.setProperty('--primary-foreground', hsl.l > 50 ? '0 0% 0%' : '0 0% 100%');
          document.documentElement.style.setProperty('--ring', hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%');
          var accentL = Math.max(0, hsl.l - 10);
          document.documentElement.style.setProperty('--accent', hsl.h + ' ' + hsl.s + '% ' + accentL + '%');
          document.documentElement.style.setProperty('--accent-foreground', accentL > 50 ? '0 0% 0%' : '0 0% 100%');
          document.documentElement.style.setProperty('--chart-1', hsl.h + ' ' + hsl.s + '% ' + hsl.l + '%');
          document.documentElement.style.setProperty('--chart-2', hsl.h + ' ' + hsl.s + '% ' + Math.max(0, hsl.l - 5) + '%');
          document.documentElement.style.setProperty('--chart-3', ((hsl.h + 10) % 360) + ' ' + Math.max(0, hsl.s - 10) + '% ' + hsl.l + '%');
          document.documentElement.style.setProperty('--chart-4', ((hsl.h - 10 + 360) % 360) + ' ' + Math.max(0, hsl.s - 10) + '% ' + hsl.l + '%');
          document.documentElement.style.setProperty('--chart-5', ((hsl.h + 20) % 360) + ' ' + Math.max(0, hsl.s - 15) + '% ' + hsl.l + '%');
        }
        document.documentElement.style.setProperty('--hover-border-color', themeColors.hoverBorderColor);
        document.documentElement.style.setProperty('--glow-intensity', config.glowIntensity + 'px');
      }
      
      applyThemeColors(config);
      
      // Re-apply colors when theme changes
      const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.attributeName === 'class') {
            const savedConfig = localStorage.getItem('navo-theme-config');
            if (savedConfig) {
              try {
                const config = JSON.parse(savedConfig);
                applyThemeColors(config);
              } catch (e) {}
            }
          }
        });
      });
      observer.observe(document.documentElement, { attributes: true });
    } catch (e) {
      console.error('Failed to apply theme config:', e);
    }
  }
})();
