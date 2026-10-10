using System;
using System.Drawing;
using System.Windows.Forms;

namespace Downshift
{
    // One line: where to pick up after the break. Writing the next step down before stopping makes it easier
    // to let go of the task during the break and to restart afterwards.
    sealed class NoteForm : Form
    {
        readonly TextBox box;
        public event Action<string> Saved;

        public NoteForm(string current, Rectangle beside)
        {
            Text = "Where will you pick up?";
            Font = new Font("Segoe UI", 9f);
            AutoScaleMode = AutoScaleMode.Font;
            FormBorderStyle = FormBorderStyle.FixedToolWindow;
            StartPosition = FormStartPosition.Manual;
            ShowInTaskbar = false;
            TopMost = true;
            Padding = new Padding(10);
            ClientSize = new Size(Math.Max(300, beside.Width - 16), 78);

            box = new TextBox { Dock = DockStyle.Top, MaxLength = 80, Text = current ?? "" };
            var save = new Button { Text = "Save", AutoSize = true, Anchor = AnchorStyles.Bottom | AnchorStyles.Right };
            save.Location = new Point(ClientSize.Width - save.PreferredSize.Width - 10, ClientSize.Height - save.PreferredSize.Height - 10);
            save.Click += delegate { Commit(); };
            Controls.Add(save);
            Controls.Add(box);
            AcceptButton = save;

            Location = new Point(beside.Right - Width, Math.Max(0, beside.Top - Height - 8));
        }

        protected override void OnShown(EventArgs e)
        {
            base.OnShown(e);
            Activate();
            box.Focus();
            box.SelectAll();
        }

        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Escape) { Close(); return true; }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        void Commit()
        {
            Action<string> handler = Saved;
            if (handler != null) handler(box.Text.Trim());
            Close();
        }
    }
}
