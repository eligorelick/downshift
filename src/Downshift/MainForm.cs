// The main window: Home, Device, Settings and Evidence. Built from standard Windows controls laid out as plain
// rows, the way Windows' own settings are, so it looks and behaves like the rest of the system.
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.Windows.Forms;

namespace Downshift
{
    enum Nav { Home = 0, Device = 1, Settings = 2, Evidence = 3 }

    sealed class MainForm : Form, IMessageFilter
    {
        readonly TrayApp app;
        readonly float dpi;
        readonly ListBox nav;
        readonly Panel host;
        readonly Page[] pages;
        readonly Timer timer;
        Page current;

        public readonly Font Body, Small, Strong, TitleFont, SectionFont;

        public int S(int px) { return (int)Math.Round(px * dpi); }

        public MainForm(TrayApp owner)
        {
            app = owner;
            using (Graphics g = Graphics.FromHwnd(IntPtr.Zero)) dpi = g.DpiX / 96f;
            Body = new Font("Segoe UI", 9.75f);
            Small = new Font("Segoe UI", 9f);
            Strong = new Font("Segoe UI Semibold", 9.75f);
            TitleFont = new Font("Segoe UI Semibold", 17f);
            SectionFont = new Font("Segoe UI Semibold", 10.5f);

            Text = "Downshift";
            Font = Body;
            AutoScaleMode = AutoScaleMode.None;
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.White;
            ClientSize = new Size(S(860), S(620));
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch (Exception) { }

            host = new Panel { Dock = DockStyle.Fill, BackColor = Color.White };
            var pane = new Panel { Dock = DockStyle.Left, Width = S(200), BackColor = Theme.Pane };
            var brand = new BrandHeader(this) { Dock = DockStyle.Top, Height = S(64) };
            nav = new ListBox
            {
                Dock = DockStyle.Fill, BorderStyle = BorderStyle.None, BackColor = Theme.Pane, DrawMode = DrawMode.OwnerDrawFixed,
                ItemHeight = S(38), IntegralHeight = false, Font = Body
            };
            nav.Items.AddRange(new object[] { "Home", "Device", "Settings", "Evidence" });
            nav.DrawItem += DrawNavItem;
            nav.SelectedIndexChanged += delegate { Go((Nav)Math.Max(0, nav.SelectedIndex)); };
            pane.Controls.Add(nav);
            pane.Controls.Add(brand);
            Controls.Add(host);
            Controls.Add(pane);

            pages = new Page[] { new HomePage(this, app), new DevicePage(this, app), new SettingsPage(this, app), new EvidencePage(this, app) };
            foreach (Page p in pages) { p.Visible = false; host.Controls.Add(p); }

            timer = new Timer { Interval = 1000 };
            timer.Tick += delegate { if (Visible && current != null) current.Tick(); };
            nav.SelectedIndex = 0;
            Application.AddMessageFilter(this);
            Disposed += delegate { Application.RemoveMessageFilter(this); };
        }

        // The mouse wheel scrolls the page under the pointer, wherever the keyboard focus is. Without this the
        // wheel would go to the focused control and change a slider or number box by accident.
        public bool PreFilterMessage(ref Message m)
        {
            const int WM_MOUSEWHEEL = 0x020A;
            if (m.Msg != WM_MOUSEWHEEL || !Visible || current == null || ActiveForm != this) return false;
            Point at = Cursor.Position;
            if (!host.RectangleToScreen(host.ClientRectangle).Contains(at)) return false;
            if (current.WheelBelongsToChild(at)) return false;
            int delta = (short)((m.WParam.ToInt64() >> 16) & 0xFFFF);
            Point pos = current.AutoScrollPosition;
            current.AutoScrollPosition = new Point(0, Math.Max(0, -pos.Y - delta * S(60) / 120));
            return true;
        }

        void DrawNavItem(object sender, DrawItemEventArgs e)
        {
            if (e.Index < 0) return;
            bool selected = (e.State & DrawItemState.Selected) != 0;
            using (var bg = new SolidBrush(selected ? Theme.PaneSelected : Theme.Pane)) e.Graphics.FillRectangle(bg, e.Bounds);
            if (selected)
                using (var bar = new SolidBrush(Theme.Accent))
                    e.Graphics.FillRectangle(bar, e.Bounds.X, e.Bounds.Y + S(9), S(3), e.Bounds.Height - S(18));
            var r = new Rectangle(e.Bounds.X + S(20), e.Bounds.Y, e.Bounds.Width - S(24), e.Bounds.Height);
            TextRenderer.DrawText(e.Graphics, (string)nav.Items[e.Index], selected ? Strong : Body, r, SystemColors.ControlText,
                TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);
        }

        public void Go(Nav which)
        {
            Page next = pages[(int)which];
            if (nav.SelectedIndex != (int)which) { nav.SelectedIndex = (int)which; return; }
            if (next == current) return;
            if (current != null) { current.Visible = false; current.Leaving(); }
            current = next;
            current.Visible = true;
            current.BringToFront();
            if (Visible) current.Entering();
            current.Tick();
        }

#if SELFTEST
        public void TestScroll(int y) { if (current != null) current.AutoScrollPosition = new Point(0, S(y)); }
#endif

        protected override void OnVisibleChanged(EventArgs e)
        {
            base.OnVisibleChanged(e);
            if (current == null) return;
            if (Visible) { timer.Start(); current.Entering(); current.Tick(); }
            else { timer.Stop(); current.Leaving(); }
        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            // Closing the window keeps Downshift running by the clock; Exit is in the tray menu.
            if (e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); }
            base.OnFormClosing(e);
        }

        // The app's mark and name at the top of the navigation pane.
        sealed class BrandHeader : Control
        {
            readonly MainForm shell;
            public BrandHeader(MainForm owner)
            {
                shell = owner;
                BackColor = Theme.Pane;
                SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
            }
            protected override void OnPaint(PaintEventArgs e)
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                e.Graphics.Clear(Theme.Pane);
                int m = shell.S(18);
                Theme.DrawMark(e.Graphics, new RectangleF(shell.S(20), (Height - m) / 2f, m, m), Theme.Accent);
                TextRenderer.DrawText(e.Graphics, "Downshift", shell.SectionFont,
                    new Rectangle(shell.S(20) + m + shell.S(10), 0, Width, Height), SystemColors.ControlText,
                    TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.NoPrefix);
            }
        }
    }

    // An on/off switch drawn the way Windows draws them.
    sealed class Toggle : Control
    {
        bool on;
        public event Action Changed;

        public Toggle(MainForm shell)
        {
            Size = new Size(shell.S(40), shell.S(20));
            TabStop = true;
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.Selectable, true);
            BackColor = Color.White;
            Cursor = Cursors.Hand;
        }

        public bool Checked
        {
            get { return on; }
            set { if (on != value) { on = value; Invalidate(); } }
        }

        void Flip()
        {
            on = !on;
            Invalidate();
            Action handler = Changed;
            if (handler != null) handler();
        }

        protected override void OnMouseUp(MouseEventArgs e) { base.OnMouseUp(e); if (e.Button == MouseButtons.Left) { Focus(); Flip(); } }
        protected override void OnKeyDown(KeyEventArgs e) { base.OnKeyDown(e); if (e.KeyCode == Keys.Space) Flip(); }
        protected override void OnGotFocus(EventArgs e) { base.OnGotFocus(e); Invalidate(); }
        protected override void OnLostFocus(EventArgs e) { base.OnLostFocus(e); Invalidate(); }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.Clear(BackColor);
            var track = new RectangleF(0.5f, 0.5f, Width - 1, Height - 1);
            using (GraphicsPath p = Theme.Rounded(track, track.Height / 2 - 0.01f))
            {
                if (on) using (var b = new SolidBrush(Theme.Accent)) g.FillPath(b, p);
                else using (var pen = new Pen(Color.FromArgb(0x8A, 0x8A, 0x8A), 1f)) g.DrawPath(pen, p);
            }
            float d = Height * 0.55f, x = on ? Width - d - Height * 0.24f : Height * 0.24f;
            using (var knob = new SolidBrush(on ? Color.White : Color.FromArgb(0x5C, 0x5C, 0x5C)))
                g.FillEllipse(knob, x, (Height - d) / 2f, d, d);
            if (Focused && ShowFocusCues) ControlPaint.DrawFocusRectangle(g, new Rectangle(0, 0, Width, Height));
        }
    }

    // The heart rate figure on the Home page.
    sealed class Readout : Control
    {
        readonly MainForm shell;
        readonly Font number, unit;
        public string Value = "--", Line = "";
        public Color Dot = Color.Gray;

        public Readout(MainForm owner)
        {
            shell = owner;
            number = new Font("Segoe UI Semibold", 38f);
            unit = new Font("Segoe UI", 11f);
            BackColor = Color.White;
            SetStyle(ControlStyles.UserPaint | ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer, true);
        }

        public void Set(string value, string line, Color dot)
        {
            if (value == Value && line == Line && dot == Dot) return;
            Value = value; Line = line; Dot = dot;
            Invalidate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
            g.Clear(BackColor);
            StringFormat f = StringFormat.GenericTypographic;
            using (var ink = new SolidBrush(SystemColors.ControlText))
            using (var grey = new SolidBrush(Theme.WindowText2))
            {
                g.DrawString(Value, number, ink, 0, 0, f);
                float w = g.MeasureString(Value, number, PointF.Empty, f).Width;
                float ascentN = number.GetHeight(g) * number.FontFamily.GetCellAscent(number.Style) / number.FontFamily.GetLineSpacing(number.Style);
                float ascentU = unit.GetHeight(g) * unit.FontFamily.GetCellAscent(unit.Style) / unit.FontFamily.GetLineSpacing(unit.Style);
                g.DrawString("bpm", unit, grey, w + shell.S(6), ascentN - ascentU, f);
                float y = number.GetHeight(g) + shell.S(2);
                float d = shell.S(8);
                using (var dot = new SolidBrush(Dot)) g.FillEllipse(dot, 1, y + (shell.Body.GetHeight(g) - d) / 2f + 1, d, d);
                g.DrawString(Line, shell.Body, grey, d + shell.S(8), y, f);
            }
        }
    }

    sealed class RowParts
    {
        public Label Title, Description;
        public Control Control;
    }

    // A page of rows, built top to bottom. Each setting is one row: what it is on the left, the control on the right.
    abstract class Page : Panel
    {
        protected readonly MainForm Shell;
        protected readonly TrayApp App;
        protected int Y;
        protected readonly int X0, ContentWidth;
        protected bool Loading;   // true while controls are being filled, so their change events are ignored

        protected Page(MainForm shell, TrayApp app)
        {
            Shell = shell;
            App = app;
            Dock = DockStyle.Fill;
            BackColor = Color.White;
            AutoScroll = true;
            X0 = shell.S(32);
            ContentWidth = shell.S(578);
            Y = shell.S(24);
        }

        public virtual void Entering() { }
        public virtual void Leaving() { }
        public virtual void Tick() { }

        // Lists scroll themselves, and an open drop-down owns the wheel.
        public bool WheelBelongsToChild(Point screen)
        {
            foreach (Control c in Controls)
            {
                var combo = c as ComboBox;
                if (combo != null && combo.DroppedDown) return true;
                if (c is ListView && c.RectangleToScreen(c.ClientRectangle).Contains(screen)) return true;
            }
            return false;
        }

        protected int S(int px) { return Shell.S(px); }

        protected int Measure(string text, Font font, int width)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            // Measured a little narrower than the label will be, so a line that only just fits is never clipped.
            return TextRenderer.MeasureText(text, font, new Size(width - S(10), 0), TextFormatFlags.WordBreak | TextFormatFlags.NoPrefix).Height;
        }

        protected Label AddText(string text, Font font, Color color, int x, int y, int width, int height)
        {
            var l = new Label { Text = text, Font = font, ForeColor = color, AutoSize = false, UseMnemonic = false, Location = new Point(x, y), Size = new Size(width, height), BackColor = Color.White };
            Controls.Add(l);
            return l;
        }

        protected void Heading(string title, string subtitle)
        {
            int h = Shell.TitleFont.Height;
            AddText(title, Shell.TitleFont, SystemColors.ControlText, X0 - S(2), Y, ContentWidth, h + S(4));
            Y += h + S(6);
            if (!string.IsNullOrEmpty(subtitle))
            {
                int sh = Measure(subtitle, Shell.Body, ContentWidth);
                AddText(subtitle, Shell.Body, Theme.WindowText2, X0, Y, ContentWidth, sh + S(2));
                Y += sh + S(4);
            }
            Y += S(8);
        }

        protected void Section(string text)
        {
            Y += S(18);
            int h = Shell.SectionFont.Height;
            AddText(text, Shell.SectionFont, SystemColors.ControlText, X0, Y, ContentWidth, h + S(2));
            Y += h + S(8);
            Rule();
        }

        protected void Rule()
        {
            Controls.Add(new Panel { BackColor = Theme.Rule, Location = new Point(X0, Y), Size = new Size(ContentWidth, 1) });
            Y += 1;
        }

        protected Label Paragraph(string text, Color color)
        {
            Y += S(10);
            int h = Measure(text, Shell.Small, ContentWidth);
            Label l = AddText(text, Shell.Small, color, X0, Y, ContentWidth, h + S(2));
            Y += h + S(4);
            return l;
        }

        // minDescriptionLines reserves room when the description changes while the page is open.
        protected RowParts Row(string title, string description, Control control, int minDescriptionLines)
        {
            int pad = S(11);
            int controlW = control == null ? 0 : control.Width;
            int textW = ContentWidth - controlW - (control == null ? 0 : S(20));
            int titleH = Shell.Body.Height;
            int descH = Math.Max(Measure(description, Shell.Small, textW), minDescriptionLines * Shell.Small.Height);
            int textH = titleH + (descH > 0 ? S(2) + descH : 0);
            int rowH = Math.Max(textH, control == null ? 0 : control.Height);
            int top = Y + pad;

            var parts = new RowParts();
            parts.Title = AddText(title, Shell.Body, SystemColors.ControlText, X0, top + (rowH - textH) / 2, textW, titleH + S(1));
            if (descH > 0)
                parts.Description = AddText(description ?? "", Shell.Small, Theme.WindowText2, X0, top + (rowH - textH) / 2 + titleH + S(2), textW, descH + S(2));
            if (control != null)
            {
                control.Location = new Point(X0 + ContentWidth - controlW, top + (rowH - control.Height) / 2);
                Controls.Add(control);
                parts.Control = control;
            }
            Y = top + rowH + pad;
            Rule();
            return parts;
        }

        protected RowParts Row(string title, string description, Control control) { return Row(title, description, control, 0); }

        protected void Done()
        {
            Y += S(28);
            AutoScrollMinSize = new Size(0, Y);
        }

        protected Button MakeButton(string text, Action click)
        {
            var b = new Button { Text = text, Font = Shell.Body, FlatStyle = FlatStyle.System, UseMnemonic = false };
            int w = TextRenderer.MeasureText(text, Shell.Body).Width + S(26);
            b.Size = new Size(Math.Max(S(84), w), S(28));
            b.Click += delegate { click(); };
            return b;
        }

        // Several buttons side by side, right-aligned as one control.
        protected Panel ButtonRow(params Button[] buttons)
        {
            var panel = new Panel { BackColor = Color.White };
            Arrange(panel, buttons);
            return panel;
        }

        protected void Arrange(Panel panel, Button[] buttons)
        {
            int x = 0;
            panel.Controls.Clear();
            foreach (Button b in buttons) { b.Location = new Point(x, 0); x += b.Width + S(8); panel.Controls.Add(b); }
            panel.Size = new Size(Math.Max(0, x - S(8)), S(28));
        }

        protected ComboBox MakeCombo(int width)
        {
            return new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Font = Shell.Body, Width = S(width) };
        }

        protected NumericUpDown MakeNumber(int min, int max, int step)
        {
            return new NumericUpDown { Minimum = min, Maximum = max, Increment = step, Font = Shell.Body, Width = S(76) };
        }

        protected TrackBar MakeSlider(int min, int max, int tick)
        {
            return new TrackBar { Minimum = min, Maximum = max, TickStyle = TickStyle.None, AutoSize = false, Size = new Size(S(200), S(28)), SmallChange = tick, LargeChange = tick, BackColor = Color.White };
        }
    }

    sealed class HomePage : Page
    {
        readonly Readout readout;
        readonly RowParts study, breathing, nudge;
        readonly Button start, takeBreak, end, pause, resume;
        readonly Panel studyButtons, nudgeButtons;
        readonly Label today;
        string studyKey = "", nudgeKey = "";

        public HomePage(MainForm shell, TrayApp app) : base(shell, app)
        {
            Heading("Home", null);
            readout = new Readout(shell) { Location = new Point(X0, Y), Size = new Size(ContentWidth - S(140), S(104)) };
            Controls.Add(readout);
            var change = new LinkLabel { Text = "Change strap", Font = shell.Body, AutoSize = true, LinkColor = Theme.Accent, ActiveLinkColor = Theme.Accent, LinkBehavior = LinkBehavior.HoverUnderline, BackColor = Color.White };
            change.Location = new Point(X0 + ContentWidth - change.PreferredWidth, Y + S(68));
            change.LinkClicked += delegate { shell.Go(Nav.Device); };
            Controls.Add(change);
            Y += S(104);

            Section("Study session");
            start = MakeButton("Start study session", app.StartStudy);
            takeBreak = MakeButton("Take a break", app.TakeBreakNow);
            end = MakeButton("End session", app.EndStudy);
            studyButtons = new Panel { BackColor = Color.White, Size = new Size(takeBreak.Width + end.Width + S(8), S(28)) };
            study = Row("Not started", "", studyButtons, 2);

            Section("Breathing");
            breathing = Row("", "", ButtonRow(
                MakeButton("5 minutes", delegate { app.BreatheNow(5); }),
                MakeButton("2 minutes", delegate { app.BreatheNow(2); }),
                MakeButton("Practice", app.Practice)), 2);

            Section("Heart rate nudge");
            pause = MakeButton("Pause for 1 hour", delegate { app.PauseNudges(60); });
            resume = MakeButton("Resume", app.ResumeNudges);
            nudgeButtons = new Panel { BackColor = Color.White, Size = new Size(pause.Width, S(28)) };
            nudge = Row("Asks whether you feel tense when your heart rate stays raised", "", nudgeButtons, 2);

            Section("Today");
            Y += S(10);
            today = AddText("", shell.Body, SystemColors.ControlText, X0, Y, ContentWidth, shell.Body.Height + S(2));
            Y += shell.Body.Height;
            Done();
        }

        static void Fit(Panel panel, MainForm shell, params Button[] buttons)
        {
            panel.Controls.Clear();
            int x = panel.Width;
            for (int i = buttons.Length - 1; i >= 0; i--)
            {
                x -= buttons[i].Width;
                buttons[i].Location = new Point(x, 0);
                panel.Controls.Add(buttons[i]);
                x -= shell.S(8);
            }
        }

        public override void Tick()
        {
            HomeInfo h = App.Home();
            readout.Set(h.Bpm, h.DeviceLine, h.DeviceGood ? Theme.Good : h.DeviceTrying ? Theme.Warn : Theme.Idle);

            study.Title.Text = h.StudyTitle;
            study.Description.Text = h.StudyDetail;
            string key = h.Studying ? (h.CanBreak ? "work" : "break") : "off";
            if (key != studyKey)
            {
                studyKey = key;
                if (key == "off") Fit(studyButtons, Shell, start);
                else if (key == "work") Fit(studyButtons, Shell, takeBreak, end);
                else Fit(studyButtons, Shell, end);
            }

            breathing.Title.Text = h.PatternName + ", " + h.PatternMinutes + " minutes";
            breathing.Description.Text = h.PatternNote;

            nudge.Description.Text = h.NudgeLine;
            string nk = h.NudgeOff ? "off" : h.NudgePaused ? "paused" : "on";
            if (nk != nudgeKey)
            {
                nudgeKey = nk;
                if (nk == "on") Fit(nudgeButtons, Shell, pause);
                else if (nk == "paused") Fit(nudgeButtons, Shell, resume);
                else nudgeButtons.Controls.Clear();
            }
            today.Text = h.Today;
        }
    }

    sealed class DevicePage : Page
    {
        readonly RowParts paired;
        readonly Button forget, pair;
        readonly ListView list;
        readonly Label scanState;

        public DevicePage(MainForm shell, TrayApp app) : base(shell, app)
        {
            Heading("Device", "Downshift reads heart rate from one strap: the one you pair here. It never connects to any other.");

            Section("Paired strap");
            forget = MakeButton("Forget this strap", delegate { app.ForgetStrap(); Tick(); });
            paired = Row("No strap paired", "", forget, 2);

            Section("Nearby straps");
            Paragraph("Straps that are broadcasting heart rate appear here within a few seconds. A WHOOP's name usually includes its serial number, which the WHOOP app shows in its device settings. The strap on your wrist will have the strongest signal.", Theme.WindowText2);
            Y += S(8);
            list = new ListView
            {
                View = View.Details, FullRowSelect = true, HideSelection = false, MultiSelect = false, Font = shell.Body,
                HeaderStyle = ColumnHeaderStyle.Nonclickable, BorderStyle = BorderStyle.FixedSingle,
                Location = new Point(X0, Y), Size = new Size(ContentWidth, S(172))
            };
            list.Columns.Add("Name", S(230));
            list.Columns.Add("ID", S(70));
            list.Columns.Add("Signal", S(120));
            list.Columns.Add("Heart rate", S(136));
            list.SelectedIndexChanged += delegate { UpdatePairButton(); };
            list.DoubleClick += delegate { PairSelected(); };
            Controls.Add(list);
            Y += S(172) + S(12);

            pair = MakeButton("Pair with selected strap", PairSelected);
            pair.Location = new Point(X0, Y);
            pair.Enabled = false;
            Controls.Add(pair);
            scanState = AddText("", shell.Small, Theme.WindowText2, X0 + pair.Width + S(14), Y + S(6), ContentWidth - pair.Width - S(14), shell.Small.Height + S(2));
            Y += S(28);
            Done();
        }

        public override void Entering() { App.SetDiscovery(true); }
        public override void Leaving() { App.SetDiscovery(false); }

        StrapCandidate Selected()
        {
            return list.SelectedItems.Count == 1 ? list.SelectedItems[0].Tag as StrapCandidate : null;
        }

        void UpdatePairButton()
        {
            StrapCandidate c = Selected();
            pair.Enabled = c != null && !App.IsPaired(c);
        }

        void PairSelected()
        {
            StrapCandidate c = Selected();
            if (c == null || App.IsPaired(c)) return;
            App.PairWith(c);
            Tick();
        }

        public override void Tick()
        {
            DeviceInfo d = App.Device();
            paired.Title.Text = d.PairedTitle;
            paired.Description.Text = d.PairedDetail;
            forget.Visible = d.HasPaired;
            scanState.Text = d.ScanState;

            // Update rows in place so the selection and scroll position survive the once-a-second refresh.
            List<StrapCandidate> found = d.Nearby;
            var keep = new Dictionary<ulong, StrapCandidate>();
            foreach (StrapCandidate c in found) keep[c.Address] = c;
            for (int i = list.Items.Count - 1; i >= 0; i--)
            {
                var old = (StrapCandidate)list.Items[i].Tag;
                if (!keep.ContainsKey(old.Address)) list.Items.RemoveAt(i);
            }
            foreach (StrapCandidate c in found)
            {
                ListViewItem item = null;
                foreach (ListViewItem it in list.Items) if (((StrapCandidate)it.Tag).Address == c.Address) { item = it; break; }
                string name = (c.Name.Length > 0 ? c.Name : "Unnamed strap") + (App.IsPaired(c) ? "  (paired)" : "");
                string signal = Pairing.Signal(c.Rssi) + ", " + c.Rssi + " dBm";
                string hr = c.HeartRate ? "Broadcasting" : "Not broadcasting";
                if (item == null)
                {
                    item = new ListViewItem(new[] { name, Pairing.ShortId(c.Address), signal, hr });
                    list.Items.Add(item);
                }
                else
                {
                    if (item.SubItems[0].Text != name) item.SubItems[0].Text = name;
                    if (item.SubItems[2].Text != signal) item.SubItems[2].Text = signal;
                    if (item.SubItems[3].Text != hr) item.SubItems[3].Text = hr;
                }
                item.Tag = c;
            }
            UpdatePairButton();
        }
    }

    sealed class SettingsPage : Page
    {
        static readonly string[] ModeKeys = { "study", "always", "off" };
        static readonly string[] ModeNames = { "During study sessions", "Whenever Downshift is running", "Never" };

        Toggle autostart, mute, spoken, tones, breakSound, nudgeSound;
        NumericUpDown block, delta, sustain, wait, cap;
        ComboBox mode, pattern, minutes, voice;
        TrackBar volume, speed;
        RowParts blockRow, patternRow, voiceRow;
        Label sampleNote;

        Settings Cfg { get { return App.Settings; } }

        public SettingsPage(MainForm shell, TrayApp app) : base(shell, app)
        {
            Loading = true;
            Heading("Settings", "Changes apply straight away.");

            Section("Sound and voice");
            mute = Switch(delegate { Cfg.Mute = mute.Checked; Voice.Hush(); });
            Row("Mute all sounds", "Silences the voice, the breathing tones and every cue. Also in the menu by the clock.", mute);
            volume = MakeSlider(0, 100, 10);
            volume.ValueChanged += delegate { if (!Loading) { Cfg.Volume = volume.Value; Changed(); } };
            Row("Volume", null, volume);
            spoken = Switch(delegate { Cfg.Voice = spoken.Checked; if (!Cfg.Voice) Voice.Hush(); });
            Row("Spoken cues", "A voice says each step of the breathing.", spoken);
            voice = MakeCombo(250);
            voice.SelectedIndexChanged += delegate
            {
                if (Loading) return;
                var chosen = voice.SelectedItem as VoiceChoice;
                Cfg.VoiceId = chosen == null ? "" : chosen.Id;
                Changed();
            };
            voiceRow = Row("Voice", "", voice, 2);
            speed = MakeSlider(-5, 5, 1);
            speed.ValueChanged += delegate { if (!Loading) { Cfg.VoiceRate = speed.Value; Changed(); } };
            Row("Speaking speed", "Left is slower, right is faster.", speed);
            Button sample = MakeButton("Play sample", PlaySample);
            RowParts sampleRow = Row("Hear the current voice", "", sample, 1);
            sampleNote = sampleRow.Description;
            tones = Switch(delegate { Cfg.Tones = tones.Checked; });
            Row("Tone on each breath", "A short note marks breathing in, holding and breathing out.", tones);
            breakSound = Switch(delegate { Cfg.BreakSound = breakSound.Checked; });
            Row("Sound when a break ends", "You are probably away from the screen, so this one is on by default.", breakSound);
            nudgeSound = Switch(delegate { Cfg.PromptSound = nudgeSound.Checked; });
            Row("Sound with a heart rate nudge", "Off by default. A silent nudge costs less focus.", nudgeSound);

            Section("Study breaks");
            block = MakeNumber(20, 50, 5);
            block.ValueChanged += delegate { if (!Loading) { Cfg.BlockMin = (int)block.Value; ShowBlockNote(); Changed(); } };
            blockRow = Row("Work block, in minutes", "", block, 2);

            Section("Breathing");
            pattern = MakeCombo(250);
            foreach (BreathPattern p in Breath.All) pattern.Items.Add(p);
            pattern.SelectedIndexChanged += delegate
            {
                var p = pattern.SelectedItem as BreathPattern;
                if (p != null && patternRow != null) patternRow.Description.Text = p.Note;
                if (Loading || p == null) return;
                Cfg.Pattern = p.Key;
                Changed();
            };
            patternRow = Row("Technique", "", pattern, 2);
            minutes = MakeCombo(250);
            minutes.Items.Add("5 minutes");
            minutes.Items.Add("2 minutes");
            minutes.SelectedIndexChanged += delegate { if (!Loading) { Cfg.Minutes = minutes.SelectedIndex == 1 ? 2 : 5; Changed(); } };
            Row("Session length", "Five minutes is the best supported. Two minutes has only small pilot studies behind it.", minutes);

            Section("Heart rate nudge");
            mode = MakeCombo(250);
            mode.Items.AddRange(ModeNames);
            mode.SelectedIndexChanged += delegate { if (!Loading) { Cfg.NudgeMode = ModeKeys[Math.Max(0, mode.SelectedIndex)]; Changed(); } };
            Row("Ask whether you feel tense", "Heart rate can't tell stress from movement, so this works best while you are sitting to study.", mode);
            delta = MakeNumber(10, 30, 1);
            delta.ValueChanged += delegate { if (!Loading) { Cfg.NudgeDelta = (int)delta.Value; Changed(); } };
            Row("Rise above your seated baseline, in bpm", null, delta);
            sustain = MakeNumber(3, 10, 1);
            sustain.ValueChanged += delegate { if (!Loading) { Cfg.NudgeMinutes = (int)sustain.Value; Changed(); } };
            Row("Held for this many minutes", null, sustain);
            wait = MakeNumber(30, 240, 10);
            wait.ValueChanged += delegate { if (!Loading) { Cfg.WaitMin = (int)wait.Value; Changed(); } };
            Row("Minutes between nudges", null, wait);
            cap = MakeNumber(1, 6, 1);
            cap.ValueChanged += delegate { if (!Loading) { Cfg.DailyCap = (int)cap.Value; Changed(); } };
            Row("Most nudges in a day", null, cap);
            Row("Preview", "Shows a sped-up example in the corner of the screen.", MakeButton("Show a preview", app.StartDemo));
            Paragraph("These four numbers are reasoned starting points, not tested values. No study validates heart rate alone as a stress detector, which is why the nudge only asks.", Theme.WindowText2);

            Section("General");
            autostart = new Toggle(shell);
            autostart.Changed += delegate { if (!Loading) app.SetAutostart(autostart.Checked); };
            Row("Start with Windows", "Downshift starts by the clock and waits there.", autostart);
            Row("Session log", "Every breathing session, nudge and study session, as a spreadsheet file.", MakeButton("Open", app.OpenLog));
            Row("Bluetooth log", "What the Bluetooth side has been doing. Useful if the strap won't connect.", MakeButton("Open", app.OpenTroubleLog));
            Row("Defaults", "Puts every setting on this page back to its evidence-based default. Your paired strap is kept.",
                MakeButton("Restore defaults", delegate { app.RestoreDefaults(); Fill(); }));
            Done();
            Loading = false;
        }

        Toggle Switch(Action apply)
        {
            var t = new Toggle(Shell);
            t.Changed += delegate { if (!Loading) { apply(); Changed(); } };
            return t;
        }

        void Changed() { App.SettingsChanged(); }

        void ShowBlockNote()
        {
            int b = (int)block.Value;
            blockRow.Description.Text = "Followed by a " + StudyClock.ShortBreakFor(b) + "-minute break, and a 20 to 30 minute break after about two hours. 25 minutes is the only length tested in student trials.";
        }

        void PlaySample()
        {
            if (Cfg.Mute) { sampleNote.Text = "Sounds are muted. Turn off Mute all sounds to hear it."; return; }
            bool ok = Voice.Speak("Breathe in gently. And slowly out.");
            sampleNote.Text = ok ? "" : "No voice is available on this PC.";
        }

        public override void Entering() { Fill(); }

        void Fill()
        {
            Loading = true;
            try
            {
                mute.Checked = Cfg.Mute;
                volume.Value = Math.Max(0, Math.Min(100, Cfg.Volume));
                spoken.Checked = Cfg.Voice;
                speed.Value = Math.Max(-5, Math.Min(5, Cfg.VoiceRate));
                tones.Checked = Cfg.Tones;
                breakSound.Checked = Cfg.BreakSound;
                nudgeSound.Checked = Cfg.PromptSound;

                List<VoiceChoice> voices = Voice.Voices();
                voice.Items.Clear();
                voice.Items.Add(new VoiceChoice("", "Windows default"));
                int pick = 0;
                foreach (VoiceChoice v in voices)
                {
                    voice.Items.Add(v);
                    if (v.Id == Cfg.VoiceId) pick = voice.Items.Count - 1;
                }
                voice.SelectedIndex = pick;
                voice.Enabled = voices.Count > 0;
                voiceRow.Description.Text = voices.Count == 0 ? "No voices were found on this PC."
                    : Voice.EngineName == "modern" ? "To get more, add a voice in Windows Settings under Time & language, Speech, then reopen this page."
                    : "These are the voices Windows provides to desktop apps.";
                sampleNote.Text = "";

                block.Value = Math.Max(block.Minimum, Math.Min(block.Maximum, Cfg.BlockMin));
                ShowBlockNote();
                pattern.SelectedItem = Breath.Get(Cfg.Pattern);
                minutes.SelectedIndex = Cfg.Minutes <= 2 ? 1 : 0;
                mode.SelectedIndex = Math.Max(0, Array.IndexOf(ModeKeys, Cfg.NudgeMode));
                delta.Value = Cfg.NudgeDelta;
                sustain.Value = Cfg.NudgeMinutes;
                wait.Value = Cfg.WaitMin;
                cap.Value = Cfg.DailyCap;
                autostart.Checked = App.AutostartEnabled();
            }
            finally { Loading = false; }
        }
    }

    sealed class EvidencePage : Page
    {
        public EvidencePage(MainForm shell, TrayApp app) : base(shell, app)
        {
            Heading("Evidence", "What the research supports, and what the app does about it.");
            Paragraph(Evidence.Intro, Theme.WindowText2);
            foreach (EvidenceSection section in Evidence.Sections)
            {
                Section(section.Title);
                foreach (string point in section.Points)
                {
                    Y += S(10);
                    int h = Measure(point, shell.Body, ContentWidth);
                    AddText(point, shell.Body, SystemColors.ControlText, X0, Y, ContentWidth, h + S(2));
                    Y += h;
                }
                Y += S(6);
            }
            Section("Key sources");
            Y += S(4);
            foreach (string source in Evidence.Sources)
            {
                Y += S(5);
                int h = Measure(source, shell.Small, ContentWidth);
                var box = new TextBox { Text = source, ReadOnly = true, BorderStyle = BorderStyle.None, BackColor = Color.White, Font = shell.Small, Location = new Point(X0, Y), Size = new Size(ContentWidth, h + S(2)), TabStop = false };
                Controls.Add(box);   // a text box, so a DOI can be selected and copied
                Y += h;
            }
            Paragraph(Evidence.Closing, Theme.WindowText2);
            Done();
        }
    }
}
