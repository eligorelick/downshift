// The small box in the bottom-right corner, laid out like a Windows notification: app name, title, text, actions.
// It follows the Windows light or dark theme and accent color, and never takes keyboard focus.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Downshift
{
    // Status: live heart rate and what the app is doing. Guide: the breathing pacer. Message: a question or notice.
    enum CardMode { Status, Guide, Message }

    sealed class CardButton
    {
        public readonly string Text;
        public readonly bool Primary;
        public readonly Action Click;
        public RectangleF Bounds;
        public CardButton(string text, bool primary, Action click) { Text = text; Primary = primary; Click = click; }
    }

    sealed class Card : Form
    {
        // Sizes are in 96-dpi units and scaled to the screen when drawn. 364 is the width of a Windows notification.
        const int W = 364, Pad = 16, ButtonH = 30, ScaleCell = 38;
        const int StatusH = 170, GuideH = 156;

        static readonly Font FApp = Theme.Ui(12f, false);
        static readonly Font FTitle = Theme.Ui(16f, true);
        static readonly Font FBody = Theme.Ui(13f, false);
        static readonly Font FNumber = Theme.Ui(40f, true);
        static readonly Font FUnit = Theme.Ui(13f, false);
        static readonly Font FLine1 = Theme.Ui(14f, true);
        static readonly Font FLine2 = Theme.Ui(12.5f, false);
        static readonly Font FCount = Theme.Ui(15f, true);
        static readonly Font FButton = Theme.Ui(13f, false);

        // Typographic formats measure and draw text with no hidden padding, so positions are exact.
        static StringFormat Typo(bool wrap, StringAlignment align, StringAlignment line)
        {
            var f = (StringFormat)StringFormat.GenericTypographic.Clone();
            f.Trimming = wrap ? StringTrimming.EllipsisWord : StringTrimming.EllipsisCharacter;
            if (!wrap) f.FormatFlags |= StringFormatFlags.NoWrap;
            f.Alignment = align;
            f.LineAlignment = line;
            return f;
        }
        static readonly StringFormat OneLine = Typo(false, StringAlignment.Near, StringAlignment.Near);
        static readonly StringFormat Wrap = Typo(true, StringAlignment.Near, StringAlignment.Near);
        static readonly StringFormat Centered = Typo(false, StringAlignment.Center, StringAlignment.Center);
        static readonly StringFormat RightLine = Typo(false, StringAlignment.Far, StringAlignment.Near);

        static float TextWidth(Graphics g, string text, Font font)
        {
            return g.MeasureString(text, font, PointF.Empty, OneLine).Width;
        }

        static float TextHeight(Graphics g, string text, Font font, float width, int maxLines)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            float line = font.GetHeight(96f);
            float h = g.MeasureString(text, font, new SizeF(width, 2000), Wrap).Height;
            return (float)Math.Ceiling(Math.Min(h, line * maxLines) + 1);
        }

        // Distance from the top of a line of text to its baseline.
        static float Ascent(Font font)
        {
            FontFamily family = font.FontFamily;
            return font.Size * family.GetCellAscent(font.Style) / family.GetEmHeight(font.Style);
        }

        // What to show. The app sets these, then calls Pop (when the size may change) or Invalidate.
        public CardMode Mode = CardMode.Status;
        public string HeaderNote = "";                            // small note in the header, e.g. "Demo"
        public string BigText = "--";                        // Status
        public string Line1 = "", Line2 = "";
        public double Fill;                                  // Guide
        public string Count = "", Cue = "", Sub = "";
        public string Title = "", Body = "";                 // Message
        public Action<int> ScalePick;                        // set to show the 1-to-5 tension scale
        public Action CloseClicked;

        readonly List<CardButton> buttons = new List<CardButton>();
        readonly RectangleF[] scaleCells = new RectangleF[5];
        RectangleF closeRect;
        int hover = -1;          // button index, 100-104 for scale cells, -2 for the close box, -1 for nothing
        float scale = 1f;
        bool rounded;            // Windows rounded the corners for us and draws the window edge itself

        public bool MouseInside { get; private set; }

        public Card()
        {
            FormBorderStyle = FormBorderStyle.None;
            StartPosition = FormStartPosition.Manual;
            ShowInTaskbar = false;
            AutoScaleMode = AutoScaleMode.None;
            Text = "Downshift";
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer, true);
        }

        protected override bool ShowWithoutActivation { get { return true; } }

        protected override CreateParams CreateParams
        {
            get
            {
                const int WS_EX_TOPMOST = 0x8, WS_EX_TOOLWINDOW = 0x80, WS_EX_NOACTIVATE = 0x08000000, CS_DROPSHADOW = 0x20000;
                CreateParams cp = base.CreateParams;
                cp.ExStyle |= WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
                cp.ClassStyle |= CS_DROPSHADOW;
                return cp;
            }
        }

        [DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            try
            {
                int round = 2;   // rounded corners on Windows 11; the call fails harmlessly on Windows 10
                rounded = DwmSetWindowAttribute(Handle, 33, ref round, sizeof(int)) == 0;
            }
            catch (Exception) { rounded = false; }
        }

        public void SetButtons(params CardButton[] list)
        {
            buttons.Clear();
            buttons.AddRange(list);
            hover = -1;
        }

#if SELFTEST
        // Test builds press buttons by their label, and scale cells by number.
        public bool Press(string text)
        {
            int n;
            if (ScalePick != null && int.TryParse(text, out n) && n >= 1 && n <= 5) { ScalePick(n); return true; }
            foreach (CardButton b in buttons)
                if (b.Text == text) { b.Click(); return true; }
            return false;
        }
#endif

        float LogicalHeight(Graphics g)
        {
            if (Mode == CardMode.Status) return StatusH;
            if (Mode == CardMode.Guide) return GuideH;
            float y = 40;
            y += TextHeight(g, Title, FTitle, W - Pad * 2, 2);
            float body = TextHeight(g, Body, FBody, W - Pad * 2, 6);
            if (body > 0) y += 6 + body;
            if (ScalePick != null) y += 14 + ButtonH;
            if (buttons.Count > 0) y += 14 + ButtonH;
            return y + Pad;
        }

        // Where the card sits on screen: bottom-right of the main display, above the taskbar.
        public Rectangle Placement()
        {
            float h = StatusH;
            try
            {
                using (Graphics g = CreateGraphics())
                {
                    scale = g.DpiX / 96f;
                    if (scale < 0.5f || scale > 6f) scale = 1f;
                    h = LogicalHeight(g);
                }
            }
            catch (Exception) { scale = 1f; }
            int w = (int)Math.Round(W * scale), height = (int)Math.Round(h * scale), margin = (int)Math.Round(12 * scale);
            Rectangle area = Screen.PrimaryScreen.WorkingArea;
            return new Rectangle(area.Right - w - margin, area.Bottom - height - margin, w, height);
        }

        // Show (or resize) without stealing focus.
        public void Pop()
        {
            Theme.Refresh();
            Rectangle r = Placement();
            if (Bounds != r) Bounds = r;
            if (!Visible) Show();
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAlias;
            g.Clear(Theme.Surface);
            g.ScaleTransform(scale, scale);
            float H = Height / scale;

            using (var text = new SolidBrush(Theme.Text))
            using (var text2 = new SolidBrush(Theme.Text2))
            using (var edge = new Pen(Theme.ControlEdge, 1f))
            {
                if (!rounded)
                    using (var outline = new Pen(Theme.Outline, 1f)) g.DrawRectangle(outline, 0.5f, 0.5f, W - 1, H - 1);

                // Header: mark, app name, optional tag, close.
                Theme.DrawMark(g, new RectangleF(Pad, 13, 14, 14), Theme.AccentFill);
                g.DrawString("Downshift", FApp, text2, Pad + 21, 12, OneLine);
                if (HeaderNote.Length > 0) g.DrawString(HeaderNote, FApp, text2, new RectangleF(120, 12, W - 120 - 42, 18), RightLine);
                closeRect = new RectangleF(W - 34, 7, 24, 24);
                if (hover == -2)
                    using (GraphicsPath p = Theme.Rounded(closeRect, 4))
                    using (var b = new SolidBrush(Theme.ControlHover)) g.FillPath(b, p);
                using (var x = new Pen(hover == -2 ? Theme.Text : Theme.Text2, 1.2f))
                {
                    float cx = closeRect.X + 12, cy = closeRect.Y + 12;
                    g.DrawLine(x, cx - 4.5f, cy - 4.5f, cx + 4.5f, cy + 4.5f);
                    g.DrawLine(x, cx + 4.5f, cy - 4.5f, cx - 4.5f, cy + 4.5f);
                }

                float buttonTop = H - Pad - ButtonH;
                if (Mode == CardMode.Status)
                {
                    const float top = 36;
                    g.DrawString(BigText, FNumber, text, Pad - 1, top, OneLine);
                    float unitLeft = Pad + TextWidth(g, BigText, FNumber) + 4;
                    g.DrawString("bpm", FUnit, text2, unitLeft, top + Ascent(FNumber) - Ascent(FUnit), OneLine);
                    float left = Math.Max(132, unitLeft + TextWidth(g, "bpm", FUnit) + 16);
                    g.DrawString(Line1, FLine1, text, new RectangleF(left, 42, W - left - Pad, 22), OneLine);
                    g.DrawString(Line2, FLine2, text2, new RectangleF(left, 65, W - left - Pad, 54), Wrap);
                }
                else if (Mode == CardMode.Guide)
                {
                    // The pacer: a ring that widens as you breathe in and narrows as you breathe out.
                    const float cx = 50, cy = 86, R = 28;
                    using (var track = new Pen(Theme.Track, 2f)) g.DrawEllipse(track, cx - R, cy - R, R * 2, R * 2);
                    float r = (float)(R * (0.46 + 0.54 * Math.Max(0, Math.Min(1, Fill))));
                    using (var wash = new SolidBrush(Color.FromArgb(34, Theme.AccentFill))) g.FillEllipse(wash, cx - r, cy - r, r * 2, r * 2);
                    using (var ring = new Pen(Theme.AccentFill, 3f)) g.DrawEllipse(ring, cx - r, cy - r, r * 2, r * 2);
                    g.DrawString(Count, FCount, text, new RectangleF(cx - R, cy - R + 0.5f, R * 2, R * 2), Centered);

                    const float left = 98;
                    g.DrawString(Cue, FTitle, text, new RectangleF(left, 42, W - left - Pad, 46), Wrap);
                    g.DrawString(Sub, FLine2, text2, new RectangleF(left, 92, W - left - Pad - 70, 18), OneLine);
                }
                else
                {
                    float y = 40;
                    float th = TextHeight(g, Title, FTitle, W - Pad * 2, 2);
                    g.DrawString(Title, FTitle, text, new RectangleF(Pad, y, W - Pad * 2, th + 2), Wrap);
                    y += th;
                    float bh = TextHeight(g, Body, FBody, W - Pad * 2, 6);
                    if (bh > 0)
                    {
                        y += 6;
                        g.DrawString(Body, FBody, text2, new RectangleF(Pad, y, W - Pad * 2, bh + 2), Wrap);
                        y += bh;
                    }
                    if (ScalePick != null)
                    {
                        y += 14;
                        DrawScale(g, y, text, text2, edge);
                    }
                }

                // Actions sit along the bottom, right-aligned, in the order given.
                float right = W - Pad;
                for (int i = buttons.Count - 1; i >= 0; i--)
                {
                    CardButton b = buttons[i];
                    float bw = Math.Max(68, (float)Math.Ceiling(TextWidth(g, b.Text, FButton)) + 26);
                    b.Bounds = new RectangleF(right - bw, buttonTop, bw, ButtonH);
                    right -= bw + 8;
                    Color fill = b.Primary ? (hover == i ? Theme.AccentHover : Theme.AccentFill) : (hover == i ? Theme.ControlHover : Theme.Control);
                    using (GraphicsPath p = Theme.Rounded(b.Bounds, 4))
                    using (var fb = new SolidBrush(fill))
                    {
                        g.FillPath(fb, p);
                        if (!b.Primary) g.DrawPath(edge, p);
                    }
                    using (var label = new SolidBrush(b.Primary ? Theme.OnAccent : Theme.Text))
                        g.DrawString(b.Text, FButton, label, b.Bounds, Centered);
                }
            }
        }

        // "Calm [1][2][3][4][5] Very tense": one joined control, so it reads as a scale and not five buttons.
        void DrawScale(Graphics g, float y, Brush text, Brush text2, Pen edge)
        {
            const string low = "Calm", high = "Very tense";
            float labelTop = y + (ButtonH - FApp.GetHeight(96f)) / 2;
            g.DrawString(low, FApp, text2, Pad, labelTop, OneLine);
            float x = Pad + TextWidth(g, low, FApp) + 10;
            var whole = new RectangleF(x, y, ScaleCell * 5, ButtonH);
            using (GraphicsPath p = Theme.Rounded(whole, 4))
            {
                using (var b = new SolidBrush(Theme.Control)) g.FillPath(b, p);
                for (int i = 0; i < 5; i++)
                {
                    scaleCells[i] = new RectangleF(x + i * ScaleCell, y, ScaleCell, ButtonH);
                    if (hover == 100 + i)
                    {
                        GraphicsState saved = g.Save();
                        g.SetClip(p, CombineMode.Intersect);
                        using (var hb = new SolidBrush(Theme.ControlHover)) g.FillRectangle(hb, scaleCells[i]);
                        g.Restore(saved);
                    }
                    if (i > 0) g.DrawLine(edge, x + i * ScaleCell, y + 1, x + i * ScaleCell, y + ButtonH - 1);
                    g.DrawString((i + 1).ToString(), FBody, text, scaleCells[i], Centered);
                }
                g.DrawPath(edge, p);
            }
            g.DrawString(high, FApp, text2, whole.Right + 10, labelTop, OneLine);
        }

        int HitTest(Point point)
        {
            var p = new PointF(point.X / scale, point.Y / scale);
            if (closeRect.Contains(p)) return -2;
            for (int i = 0; i < buttons.Count; i++) if (buttons[i].Bounds.Contains(p)) return i;
            if (Mode == CardMode.Message && ScalePick != null)
                for (int i = 0; i < 5; i++) if (scaleCells[i].Contains(p)) return 100 + i;
            return -1;
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            MouseInside = true;
            int h = HitTest(e.Location);
            if (h != hover)
            {
                hover = h;
                Cursor = h == -1 ? Cursors.Default : Cursors.Hand;
                Invalidate();
            }
        }

        protected override void OnMouseLeave(EventArgs e)
        {
            base.OnMouseLeave(e);
            MouseInside = false;
            if (hover != -1) { hover = -1; Cursor = Cursors.Default; Invalidate(); }
        }

        protected override void OnMouseUp(MouseEventArgs e)
        {
            base.OnMouseUp(e);
            if (e.Button != MouseButtons.Left) return;
            int h = HitTest(e.Location);
            if (h == -2) { if (CloseClicked != null) CloseClicked(); }
            else if (h >= 100) { Action<int> pick = ScalePick; if (pick != null) pick(h - 99); }
            else if (h >= 0 && h < buttons.Count) buttons[h].Click();
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            // Alt+F4 or the system closing the window hides it; the app keeps running in the tray.
            if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); }
            base.OnFormClosing(e);
        }
    }
}
