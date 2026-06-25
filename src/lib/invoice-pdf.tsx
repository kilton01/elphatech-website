import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a' },
  headerBar: { height: 4, backgroundColor: '#E8302A', marginBottom: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyName: { fontSize: 18, fontWeight: 'bold' },
  invoiceNumber: { fontSize: 12, textAlign: 'right' },
  statusBadge: { fontSize: 9, marginTop: 4, color: '#666' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metaBlock: { gap: 4 },
  metaLabel: { fontSize: 8, color: '#666', textTransform: 'uppercase' },
  metaValue: { fontSize: 10 },
  table: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5', paddingVertical: 8, backgroundColor: '#fafafa' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 6 },
  colDesc: { flex: 4, paddingRight: 8 },
  colQty: { flex: 1, textAlign: 'right', paddingRight: 8 },
  colPrice: { flex: 1.5, textAlign: 'right', paddingRight: 8 },
  colAmount: { flex: 1.5, textAlign: 'right' },
  headerText: { fontSize: 8, fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
  totalRow: { flexDirection: 'row', marginTop: 12, paddingTop: 8, borderTopWidth: 2, borderTopColor: '#1a1a1a' },
  totalLabel: { flex: 6.5, textAlign: 'right', paddingRight: 8, fontWeight: 'bold', fontSize: 11 },
  totalValue: { flex: 1.5, textAlign: 'right', fontWeight: 'bold', fontSize: 11 },
  notes: { marginTop: 30, padding: 12, backgroundColor: '#fafafa', borderRadius: 4 },
  notesLabel: { fontSize: 8, color: '#666', marginBottom: 4, textTransform: 'uppercase' },
  footer: { position: 'absolute', bottom: 40, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#999' },
});

type InvoiceData = {
  invoiceNumber: string;
  status: string;
  currency: string;
  notes: string | null;
  issuedAt: string | null;
  dueAt: string | null;
  projectName: string;
  milestoneTitle: string | null;
  items: {
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
  }[];
  total: number;
};

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatCurrency(amount: number | string, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency} ${num.toFixed(2)}`;
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBar} />

        <View style={styles.headerRow}>
          <Text style={styles.companyName}>ElphaTech Solutions</Text>
          <View>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.statusBadge}>{data.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Project</Text>
            <Text style={styles.metaValue}>{data.projectName}</Text>
            {data.milestoneTitle && (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Milestone</Text>
                <Text style={styles.metaValue}>{data.milestoneTitle}</Text>
              </>
            )}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{formatDate(data.issuedAt)}</Text>
            <Text style={[styles.metaLabel, { marginTop: 8 }]}>Due</Text>
            <Text style={styles.metaValue}>{formatDate(data.dueAt)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Unit Price</Text>
            <Text style={[styles.headerText, styles.colAmount]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{parseFloat(item.quantity).toString()}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice, data.currency)}</Text>
              <Text style={styles.colAmount}>{formatCurrency(item.amount, data.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(data.total, data.currency)}</Text>
        </View>

        {data.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Thank you for your business. — ElphaTech Solutions
        </Text>
      </Page>
    </Document>
  );
}
