import {
  Html,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Button,
  Hr,
} from '@react-email/components';

interface WasteReportEmailProps {
  reportId: number;
  wasteType: string;
  severity: string;
  location: string;
  municipalityName: string;
  reporterName: string;
  description: string;
  actionUrl: string;
}

export function WasteReportNotificationEmail({
  reportId,
  wasteType,
  severity,
  location,
  municipalityName,
  reporterName,
  description,
  actionUrl,
}: WasteReportEmailProps) {
  const severityColor = 
    severity === 'critical' ? '#dc2626' :
    severity === 'high' ? '#ea580c' :
    severity === 'medium' ? '#ca8a04' : '#16a34a';

  return (
    <Html>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={heading}>🌍 New Waste Report Assignment</Heading>
          </Section>

          <Section style={content}>
            <Text style={text}>Hello {municipalityName} Team,</Text>

            <Text style={text}>
              A new waste report has been submitted by a citizen and automatically assigned to your team for review and action.
            </Text>

            <Section style={reportDetails}>
              <Text style={label}>Report ID:</Text>
              <Text style={value}>#{reportId}</Text>

              <Text style={label}>Waste Type:</Text>
              <Text style={value}>{wasteType.charAt(0).toUpperCase() + wasteType.slice(1)}</Text>

              <Text style={{ ...label, marginTop: '12px' }}>Severity Level:</Text>
              <Text style={{ ...value, color: severityColor, fontWeight: 'bold' }}>
                {severity.toUpperCase()}
              </Text>

              <Text style={label}>Location:</Text>
              <Text style={value}>{location}</Text>

              <Text style={label}>Description:</Text>
              <Text style={value}>{description}</Text>

              <Text style={label}>Submitted by:</Text>
              <Text style={value}>{reporterName}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={text}>
              Please log in to your municipality dashboard to review this report and take appropriate action.
            </Text>

            <Button style={button} href={actionUrl}>
              View Report Details
            </Button>

            <Text style={footer}>
              © 2024 CleanUp Connect. Building sustainable communities through civic engagement.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f4f4f4',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
  maxWidth: '100%',
};

const header = {
  backgroundColor: '#16a34a',
  padding: '24px 20px',
  borderRadius: '8px 8px 0 0',
};

const heading = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 30px',
  borderRadius: '0 0 8px 8px',
};

const text = {
  color: '#1f2937',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '16px 0',
};

const reportDetails = {
  backgroundColor: '#f9fafb',
  padding: '20px',
  borderRadius: '8px',
  margin: '24px 0',
  border: '1px solid #e5e7eb',
};

const label = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  margin: '12px 0 4px 0',
  letterSpacing: '0.5px',
};

const value = {
  color: '#1f2937',
  fontSize: '15px',
  margin: '0 0 8px 0',
  lineHeight: '1.5',
};

const button = {
  backgroundColor: '#16a34a',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 'bold',
  padding: '14px 28px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  textAlign: 'center' as const,
  margin: '24px 0 0 0',
  lineHeight: '1.5',
};
