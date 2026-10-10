// Colors and type. The popup follows the Windows theme and accent color, so it sits on the
// desktop like any other Windows notification. The main window uses standard Windows controls and colors.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using Microsoft.Win32;

namespace Downshift
{
    static class Theme
    {
        public static bool Dark;          // apps use the dark theme
        public static bool TaskbarDark = true;
        public static Color Accent = Color.FromArgb(0x00, 0x5F, 0xB8);
        static long readAt = -1000000;

        // Re-read at most every few seconds; cheap, and it picks up a theme change without a restart.
        public static void Refresh()
        {
            long now = Clock.Now();
            if (now - readAt < 5000) return;
            readAt = now;
#if SELFTEST
            string forced = Environment.GetEnvironmentVariable("DOWNSHIFT_THEME");
            if (forced != null) { Dark = forced == "dark"; TaskbarDark = Dark; return; }
#endif
            try
            {
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"))
                {
                    if (key != null)
                    {
                        object apps = key.GetValue("AppsUseLightTheme"), system = key.GetValue("SystemUsesLightTheme");
                        if (apps is int) Dark = (int)apps == 0;
                        if (system is int) TaskbarDark = (int)system == 0;
                    }
                }
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\DWM"))
                {
                    object value = key == null ? null : key.GetValue("AccentColor");
                    if (value is int)
                    {
                        int abgr = (int)value;   // stored as alpha, blue, green, red
                        Accent = Color.FromArgb(abgr & 0xFF, (abgr >> 8) & 0xFF, (abgr >> 16) & 0xFF);
                    }
                }
            }
            catch (Exception) { }
        }

        static Color Hex(int rgb) { return Color.FromArgb((rgb >> 16) & 0xFF, (rgb >> 8) & 0xFF, rgb & 0xFF); }

        static Color Mix(Color a, Color b, double t)
        {
            return Color.FromArgb((int)(a.R + (b.R - a.R) * t), (int)(a.G + (b.G - a.G) * t), (int)(a.B + (b.B - a.B) * t));
        }

        // Relative luminance as the accessibility guidelines define it.
        static double Luminance(Color c)
        {
            double r = Channel(c.R), g = Channel(c.G), b = Channel(c.B);
            return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        }

        static double Channel(int v)
        {
            double x = v / 255.0;
            return x <= 0.03928 ? x / 12.92 : Math.Pow((x + 0.055) / 1.055, 2.4);
        }

        static double Contrast(Color a, Color b)
        {
            double la = Luminance(a), lb = Luminance(b);
            return (Math.Max(la, lb) + 0.05) / (Math.Min(la, lb) + 0.05);
        }

        // Popup surfaces
        public static Color Surface { get { return Dark ? Hex(0x2B2B2B) : Hex(0xF9F9F9); } }
        public static Color Outline { get { return Dark ? Hex(0x484848) : Hex(0xCFCFCF); } }
        public static Color Text { get { return Dark ? Hex(0xFFFFFF) : Hex(0x1A1A1A); } }
        public static Color Text2 { get { return Dark ? Hex(0xC7C7C7) : Hex(0x5C5C5C); } }
        public static Color Control { get { return Dark ? Hex(0x383838) : Hex(0xFFFFFF); } }
        public static Color ControlHover { get { return Dark ? Hex(0x434343) : Hex(0xF0F0F0); } }
        public static Color ControlEdge { get { return Dark ? Hex(0x7A7A7A) : Hex(0x8F8F8F); } }   // 3:1 against the surface, so a button is visible without its label
        public static Color Track { get { return Dark ? Hex(0x4A4A4A) : Hex(0xDADADA); } }

        // On a dark surface Windows uses a lighter tint of the accent so it stays readable.
        // Whatever accent the person has chosen in Windows, it is nudged until it stands out from the popup's surface.
        public static Color AccentFill
        {
            get
            {
                Color c = Dark ? Mix(Accent, Color.White, 0.45) : Accent;
                for (int i = 0; i < 8 && Contrast(c, Surface) < 3.0; i++) c = Mix(c, Dark ? Color.White : Color.Black, 0.15);
                return c;
            }
        }
        public static Color AccentHover { get { return Mix(AccentFill, Dark ? Color.Black : Color.White, 0.12); } }
        // Black or white, whichever reads better on the accent.
        public static Color OnAccent
        {
            get { Color a = AccentFill; return Contrast(a, Color.Black) >= Contrast(a, Color.White) ? Hex(0x000000) : Hex(0xFFFFFF); }
        }

        // Main window (always light, like the standard controls it is built from)
        public static readonly Color Pane = Hex(0xF3F3F3);
        public static readonly Color PaneSelected = Hex(0xE6E6E6);
        public static readonly Color Rule = Hex(0xE4E4E4);
        public static readonly Color WindowText2 = Hex(0x5F5F5F);
        public static readonly Color Good = Hex(0x107C10);
        public static readonly Color Warn = Hex(0x9D5D00);
        public static readonly Color Idle = Hex(0x8A8A8A);

        public static Font Ui(float px, bool semibold)
        {
            return new Font(semibold ? "Segoe UI Semibold" : "Segoe UI", px, FontStyle.Regular, GraphicsUnit.Pixel);
        }

        // The app's mark: a ring with a dot, the breathing pacer at rest.
        public static void DrawMark(Graphics g, RectangleF box, Color color)
        {
            float stroke = Math.Max(1.2f, box.Width * 0.12f);
            using (var pen = new Pen(color, stroke))
                g.DrawEllipse(pen, box.X + stroke / 2, box.Y + stroke / 2, box.Width - stroke, box.Height - stroke);
            float r = box.Width * 0.17f;
            using (var b = new SolidBrush(color))
                g.FillEllipse(b, box.X + box.Width / 2 - r, box.Y + box.Height / 2 - r, r * 2, r * 2);
        }

        public static GraphicsPath Rounded(RectangleF r, float radius)
        {
            float d = radius * 2;
            var p = new GraphicsPath();
            p.AddArc(r.X, r.Y, d, d, 180, 90);
            p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            p.CloseFigure();
            return p;
        }
    }
}
