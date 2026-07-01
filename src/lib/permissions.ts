export function canSubmitReports(member: { role: string; canTest: boolean }): boolean {
  return member.role === 'tester' || member.canTest === true;
}

export function canLeaveFeedback(member: { role: string }): boolean {
  return member.role === 'client';
}
