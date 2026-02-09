/**
 * Sample data for tracking survey demonstration.
 * Simulates a continuous feedback collection scenario where new answers
 * arrive in batches over time.
 */

/**
 * Wave 1: Initial batch of answers (collected on Day 1)
 * These will be evaluated first.
 */
export const wave1Answers = [
  { customer_id: 'week1_001', answer_text: 'Love the new dashboard design, very intuitive' },
  { customer_id: 'week1_002', answer_text: 'Mobile app crashes sometimes when uploading images' },
  { customer_id: 'week1_003', answer_text: 'Great customer support, very helpful and fast response' },
  { customer_id: 'week1_004', answer_text: 'Need better export options for large datasets' },
  { customer_id: 'week1_005', answer_text: 'Search functionality is slow with many records' },
  { customer_id: 'week1_006', answer_text: 'Love the keyboard shortcuts, saves so much time' },
  { customer_id: 'week1_007', answer_text: 'Dark mode would be really helpful for night work' },
  { customer_id: 'week1_008', answer_text: 'Integration with Slack works perfectly' },
  { customer_id: 'week1_009', answer_text: 'The onboarding tutorial was very helpful' },
  { customer_id: 'week1_010', answer_text: 'Pricing is fair for the features offered' }
];

/**
 * Wave 2: Second batch of answers (collected on Day 7)
 * These will be added and evaluated in the continuation.
 */
export const wave2Answers = [
  { customer_id: 'week2_001', answer_text: 'Recent update improved performance significantly' },
  { customer_id: 'week2_002', answer_text: 'Still waiting for better PDF export quality' },
  { customer_id: 'week2_003', answer_text: 'Team collaboration features are excellent' },
  { customer_id: 'week2_004', answer_text: 'Would love calendar integration with Google Calendar' },
  { customer_id: 'week2_005', answer_text: 'API documentation could use more examples' },
  { customer_id: 'week2_006', answer_text: 'New filter options are exactly what we needed' },
  { customer_id: 'week2_007', answer_text: 'Mobile app is much better after the latest update' },
  { customer_id: 'week2_008', answer_text: 'Need SSO support for enterprise customers' },
  { customer_id: 'week2_009', answer_text: 'Bulk edit feature saved us hours of work' },
  { customer_id: 'week2_010', answer_text: 'Reporting features are comprehensive' }
];

/**
 * Wave 3: Third batch of answers (collected on Day 14)
 * Demonstrates a third iteration of the tracking survey.
 */
export const wave3Answers = [
  { customer_id: 'week3_001', answer_text: 'Dashboard customization options are great' },
  { customer_id: 'week3_002', answer_text: 'Email notifications could be more configurable' },
  { customer_id: 'week3_003', answer_text: 'Love the new chart types added last week' },
  { customer_id: 'week3_004', answer_text: 'Would appreciate more keyboard shortcuts' },
  { customer_id: 'week3_005', answer_text: 'Data import from Excel works flawlessly now' }
];

/**
 * Question text for the tracking survey
 */
export const trackingSurveyQuestion = {
  question_text: 'What feedback do you have about our product this week?',
  question_name: 'Weekly Product Feedback',
  additional_instruction: 'Focus on categorizing feedback into: positive sentiment, feature requests, bug reports, and performance feedback'
};

/**
 * Survey metadata
 */
export const trackingSurveyInfo = {
  name: 'Weekly Customer Feedback Tracker 2025',
  comment: 'Continuous feedback collection tracking survey'
};
