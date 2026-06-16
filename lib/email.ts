import nodemailer from 'nodemailer';

// Create transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string | string[];
  subject: string;
  react?: React.ReactElement;
  html?: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions) {
  try {
    // Convert React element to HTML if provided
    let htmlContent = options.html;
    
    if (options.react && !htmlContent) {
      // For React email templates, we'll render them to HTML
      const { render } = await import('@react-email/render');
      htmlContent = render(options.react);
    }

    const info = await transporter.sendMail({
      from: `"CleanUp Connect" <${process.env.GMAIL_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: htmlContent,
      text: options.text,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, data: info };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
}