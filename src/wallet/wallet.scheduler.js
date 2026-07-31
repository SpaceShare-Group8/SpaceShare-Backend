// ================================================================
// WALLET SCHEDULER
// Scheduled jobs for automated wallet operations
// PRD Sections: 10.8, 11.8
// ================================================================

import cron from 'node-cron';
import pool from '../common/config/db.js';
import {
  PAYOUT_SCHEDULE_STATUS,
  WITHDRAWAL_STATUS,
  PAYOUT_CONSTANTS,
  WALLET_ERROR_MESSAGES
} from './wallet.constants.js';

import {
  getPendingPayouts as getPendingPayoutsRepo,
  markPayoutCompleted,
  markPayoutFailed,
  updateWithdrawalStatus,
  findWalletByHostId,
  updateWalletBalance,
  createTransaction
} from './wallet.repository.js';

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Create a notification record
 */
const createNotification = async (userId, type, title, message, metadata = {}) => {
  const query = `
    INSERT INTO notifications (user_id, type, title, message, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id
  `;
  const result = await pool.query(query, [userId, type, title, message, JSON.stringify(metadata)]);
  return result.rows[0];
};

/**
 * Log system action
 */
const logSystemAction = async (action, details) => {
  const query = `
    INSERT INTO system_logs (action, details, created_at)
    VALUES ($1, $2, NOW())
  `;
  await pool.query(query, [action, JSON.stringify(details)]);
};

/**
 * Generate a unique reference
 */
const generateReference = (prefix = 'SCH') => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${date}-${random}`;
};

// ================================================================
// JOB 1: AUTO-PAYOUT PROCESSING
// PRD Section 10.8 - Process payouts after 24-hour hold period
// Runs every hour
// ================================================================

/**
 * Process payouts that have completed their 24-hour hold period
 * Fetches payouts where scheduled_date <= NOW() and status = 'pending'
 * Processes them in batches and updates statuses
 */
export const processAutoPayouts = async () => {
  const startTime = Date.now();
  console.log(`🔄 [${new Date().toISOString()}] Starting auto-payout processing...`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get payouts ready for processing (scheduled_date <= NOW() AND status = 'pending')
    const readyPayouts = await getPendingPayoutsRepo({
      limit: PAYOUT_CONSTANTS.BATCH_SIZE,
      status: PAYOUT_SCHEDULE_STATUS.PENDING
    });

    if (readyPayouts.length === 0) {
      await client.query('COMMIT');
      console.log(`✅ [${new Date().toISOString()}] No pending payouts ready for processing`);
      return {
        processed: 0,
        successful: 0,
        failed: 0,
        message: 'No pending payouts ready for processing'
      };
    }

    console.log(`📋 [${new Date().toISOString()}] Found ${readyPayouts.length} payouts ready for processing`);

    let successful = 0;
    let failed = 0;
    const failedIds = [];
    let totalAmount = 0;

    // Process each payout
    for (const payout of readyPayouts) {
      try {
        // Update status to 'ready' before processing
        await client.query(
          `UPDATE payout_schedules 
           SET status = 'ready', updated_at = NOW() 
           WHERE id = $1 AND status = 'pending'`,
          [payout.id]
        );

        // Here you would integrate with your payment provider (Paystack/Flutterwave)
        // to actually send money to the host's bank account
        // For MVP, we simulate success with a flag
        const providerSuccess = true; // In production, call payment provider API

        if (providerSuccess) {
          // Mark payout as completed
          await markPayoutCompleted(payout.id);

          // Get host's wallet
          const wallet = await findWalletByHostId(payout.host_id);
          
          if (wallet) {
            // Create transaction record for the payout
            const transactionQuery = `
              INSERT INTO transactions (
                booking_id,
                wallet_id,
                amount,
                commission_amount,
                type,
                status,
                reference,
                payment_method,
                provider_fee,
                metadata,
                created_at,
                updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
              RETURNING id
            `;
            
            await client.query(transactionQuery, [
              payout.booking_id,
              wallet.id,
              payout.amount,
              0, // No commission on payouts
              'payout',
              'completed',
              generateReference('PAY'),
              'bank_transfer',
              0,
              JSON.stringify({
                payout_id: payout.id,
                scheduled_date: payout.scheduled_date,
                processed_by: 'auto_scheduler'
              })
            ]);
          }

          // Create notification for host
          await createNotification(
            payout.host_id,
            'payout_completed',
            'Payout Completed 💰',
            `Your payout of ₦${parseFloat(payout.amount).toFixed(2)} has been sent to your bank account.`,
            { 
              payoutId: payout.id, 
              amount: payout.amount,
              bookingId: payout.booking_id
            }
          );

          successful++;
          totalAmount += parseFloat(payout.amount);

          // Log success
          await logSystemAction('auto_payout_success', {
            payout_id: payout.id,
            host_id: payout.host_id,
            amount: payout.amount,
            booking_id: payout.booking_id
          });

          console.log(`✅ [${new Date().toISOString()}] Payout ${payout.id} processed successfully`);

        } else {
          // Provider failed, mark as failed with retry
          const retryCount = parseInt(payout.retry_count || 0) + 1;
          
          if (retryCount >= PAYOUT_CONSTANTS.MAX_RETRY_ATTEMPTS) {
            await markPayoutFailed(payout.id, 'Provider payment failed after max retries');
          } else {
            // Reset status to pending for retry with delay
            await client.query(
              `UPDATE payout_schedules 
               SET status = 'pending', 
                   retry_count = $1,
                   scheduled_date = NOW() + INTERVAL '${PAYOUT_CONSTANTS.RETRY_DELAY_HOURS} hours',
                   updated_at = NOW()
               WHERE id = $2`,
              [retryCount, payout.id]
            );
          }

          failed++;
          failedIds.push(payout.id);

          // Log failure
          await logSystemAction('auto_payout_failed', {
            payout_id: payout.id,
            host_id: payout.host_id,
            amount: payout.amount,
            retry_count: retryCount,
            error: 'Provider payment failed'
          });

          console.warn(`⚠️ [${new Date().toISOString()}] Payout ${payout.id} failed (retry ${retryCount}/${PAYOUT_CONSTANTS.MAX_RETRY_ATTEMPTS})`);
        }

      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error processing payout ${payout.id}:`, error.message);
        failed++;
        failedIds.push(payout.id);

        // Mark as failed with error reason
        await markPayoutFailed(payout.id, error.message);

        // Log error
        await logSystemAction('auto_payout_error', {
          payout_id: payout.id,
          host_id: payout.host_id,
          amount: payout.amount,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Auto-payout processing completed in ${duration}ms`);
    console.log(`📊 Summary: ${successful} successful, ${failed} failed, Total: ₦${totalAmount.toFixed(2)}`);

    return {
      processed: readyPayouts.length,
      successful,
      failed,
      failed_ids: failedIds,
      total_amount: totalAmount,
      duration_ms: duration
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ [${new Date().toISOString()}] Auto-payout processing error:`, error.message);
    
    await logSystemAction('auto_payout_batch_error', {
      error: error.message,
      stack: error.stack
    });

    throw error;
  } finally {
    client.release();
  }
};

// ================================================================
// JOB 2: EXPIRED PAYOUT CLEANUP
// Clean up stuck/failed payouts
// Runs daily at 2:00 AM
// ================================================================

/**
 * Clean up expired/stuck payouts
 * Marks old pending payouts as failed after auto-cancel period
 */
export const cleanupExpiredPayouts = async () => {
  const startTime = Date.now();
  console.log(`🧹 [${new Date().toISOString()}] Starting expired payout cleanup...`);

  try {
    // Mark payouts as failed if they've been pending too long
    const query = `
      UPDATE payout_schedules
      SET 
        status = 'failed',
        failed_reason = 'Auto-cancelled: Exceeded maximum pending period',
        updated_at = NOW()
      WHERE status IN ('pending', 'ready')
        AND created_at < NOW() - INTERVAL '${PAYOUT_CONSTANTS.AUTO_CANCEL_DAYS} days'
      RETURNING id, host_id, amount
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log(`✅ [${new Date().toISOString()}] No expired payouts to clean up`);
      return { cleaned: 0, message: 'No expired payouts found' };
    }

    // Log each cleanup
    for (const payout of result.rows) {
      await logSystemAction('auto_payout_cleanup', {
        payout_id: payout.id,
        host_id: payout.host_id,
        amount: payout.amount,
        reason: 'Exceeded maximum pending period'
      });

      // Notify host
      await createNotification(
        payout.host_id,
        'payout_cancelled',
        'Payout Cancelled ⚠️',
        `Your payout of ₦${parseFloat(payout.amount).toFixed(2)} was automatically cancelled as it exceeded the maximum pending period. Please contact support.`,
        { payoutId: payout.id, amount: payout.amount }
      );
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Expired payout cleanup completed in ${duration}ms`);
    console.log(`📊 Cleaned ${result.rows.length} expired payouts`);

    return {
      cleaned: result.rows.length,
      duration_ms: duration,
      payouts: result.rows.map(p => ({
        id: p.id,
        host_id: p.host_id,
        amount: parseFloat(p.amount)
      }))
    };

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Expired payout cleanup error:`, error.message);
    
    await logSystemAction('auto_payout_cleanup_error', {
      error: error.message
    });

    throw error;
  }
};

// ================================================================
// JOB 3: WITHDRAWAL EXPIRY
// Auto-cancel pending withdrawals after 7 days
// Runs daily at 3:00 AM
// ================================================================

/**
 * Auto-cancel stale pending withdrawals
 * Cancels withdrawals pending for more than 7 days
 * Refunds the amount back to wallet
 */
export const expirePendingWithdrawals = async () => {
  const startTime = Date.now();
  console.log(`⏰ [${new Date().toISOString()}] Starting withdrawal expiry check...`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Find stale pending withdrawals
    const staleQuery = `
      SELECT id, host_id, amount, reference
      FROM withdrawal_requests
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '7 days'
    `;

    const staleResult = await client.query(staleQuery);

    if (staleResult.rows.length === 0) {
      await client.query('COMMIT');
      console.log(`✅ [${new Date().toISOString()}] No stale withdrawals to expire`);
      return { expired: 0, message: 'No stale withdrawals found' };
    }

    console.log(`📋 [${new Date().toISOString()}] Found ${staleResult.rows.length} stale withdrawals`);

    let expired = 0;
    let refunded = 0;

    for (const withdrawal of staleResult.rows) {
      try {
        // Update withdrawal status to cancelled
        await updateWithdrawalStatus(withdrawal.id, WITHDRAWAL_STATUS.CANCELLED, {
          reason: 'Auto-cancelled: Withdrawal expired after 7 days'
        });

        // Refund the amount back to wallet
        const wallet = await findWalletByHostId(withdrawal.host_id);
        if (wallet) {
          await updateWalletBalance(withdrawal.host_id, parseFloat(withdrawal.amount), 'add');

          // Create refund transaction record
          const refundQuery = `
            INSERT INTO transactions (
              booking_id,
              wallet_id,
              amount,
              commission_amount,
              type,
              status,
              reference,
              payment_method,
              provider_fee,
              metadata,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING id
          `;
          
          await client.query(refundQuery, [
            null,
            wallet.id,
            withdrawal.amount,
            0,
            'adjustment',
            'completed',
            generateReference('REF'),
            'auto_refund',
            0,
            JSON.stringify({
              withdrawal_id: withdrawal.id,
              reason: 'Auto-refund: Withdrawal expired',
              expired_at: new Date().toISOString()
            })
          ]);

          refunded++;
        }

        // Notify host
        await createNotification(
          withdrawal.host_id,
          'withdrawal_expired',
          'Withdrawal Expired ⏰',
          `Your withdrawal request of ₦${parseFloat(withdrawal.amount).toFixed(2)} has expired and been cancelled. Funds have been refunded to your wallet.`,
          { withdrawalId: withdrawal.id, amount: withdrawal.amount }
        );

        // Log action
        await logSystemAction('withdrawal_auto_expired', {
          withdrawal_id: withdrawal.id,
          host_id: withdrawal.host_id,
          amount: withdrawal.amount,
          reference: withdrawal.reference
        });

        expired++;

        console.log(`✅ [${new Date().toISOString()}] Withdrawal ${withdrawal.id} expired and refunded`);

      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error expiring withdrawal ${withdrawal.id}:`, error.message);
        
        await logSystemAction('withdrawal_expiry_error', {
          withdrawal_id: withdrawal.id,
          host_id: withdrawal.host_id,
          error: error.message
        });
      }
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Withdrawal expiry completed in ${duration}ms`);
    console.log(`📊 Expired: ${expired}, Refunded: ${refunded}`);

    return {
      expired,
      refunded,
      duration_ms: duration
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ [${new Date().toISOString()}] Withdrawal expiry error:`, error.message);
    
    await logSystemAction('withdrawal_expiry_batch_error', {
      error: error.message
    });

    throw error;
  } finally {
    client.release();
  }
};

// ================================================================
// JOB 4: DAILY EARNINGS SUMMARY NOTIFICATIONS
// Send daily earnings summary to hosts
// Runs daily at 9:00 AM
// ================================================================

/**
 * Send daily earnings summary notifications to hosts with new earnings
 * Notifies hosts about their daily earnings from completed bookings
 */
export const sendDailyEarningsSummary = async () => {
  const startTime = Date.now();
  console.log(`📊 [${new Date().toISOString()}] Sending daily earnings summaries...`);

  try {
    // Get hosts who had earnings in the last 24 hours
    const earningsQuery = `
      SELECT 
        ps.host_id,
        u.full_name as host_name,
        u.email as host_email,
        COUNT(ps.id) as booking_count,
        COALESCE(SUM(ps.amount), 0) as total_earnings,
        ARRAY_AGG(DISTINCT w.title) as workspace_titles
      FROM payout_schedules ps
      JOIN users u ON ps.host_id = u.id
      LEFT JOIN bookings b ON ps.booking_id = b.id
      LEFT JOIN workspaces w ON b.workspace_id = w.id
      WHERE ps.status = 'completed'
        AND ps.completed_date >= NOW() - INTERVAL '24 hours'
      GROUP BY ps.host_id, u.full_name, u.email
    `;

    const earningsResult = await pool.query(earningsQuery);

    if (earningsResult.rows.length === 0) {
      console.log(`✅ [${new Date().toISOString()}] No new earnings to report`);
      return { sent: 0, message: 'No new earnings to report' };
    }

    console.log(`📋 [${new Date().toISOString()}] Found ${earningsResult.rows.length} hosts with new earnings`);

    let sent = 0;

    for (const host of earningsResult.rows) {
      try {
        const totalEarnings = parseFloat(host.total_earnings);
        const bookingCount = parseInt(host.booking_count, 10);
        const workspaceNames = host.workspace_titles || ['Your space'];

        // Create earnings summary notification
        await createNotification(
          host.host_id,
          'daily_earnings_summary',
          'Daily Earnings Summary 📊',
          `You earned ₦${totalEarnings.toFixed(2)} from ${bookingCount} booking${bookingCount > 1 ? 's' : ''} in the last 24 hours.`,
          {
            period: 'daily',
            total_earnings: totalEarnings,
            booking_count: bookingCount,
            workspaces: workspaceNames,
            date: new Date().toISOString()
          }
        );

        // Log action
        await logSystemAction('daily_earnings_summary_sent', {
          host_id: host.host_id,
          total_earnings: totalEarnings,
          booking_count: bookingCount
        });

        sent++;

        console.log(`✅ [${new Date().toISOString()}] Earnings summary sent to host ${host.host_id}`);

      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error sending earnings summary to host ${host.host_id}:`, error.message);
        
        await logSystemAction('daily_earnings_summary_error', {
          host_id: host.host_id,
          error: error.message
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Daily earnings summaries sent in ${duration}ms`);
    console.log(`📊 Sent ${sent} summaries`);

    return {
      sent,
      total_hosts: earningsResult.rows.length,
      duration_ms: duration
    };

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Daily earnings summary error:`, error.message);
    
    await logSystemAction('daily_earnings_summary_batch_error', {
      error: error.message
    });

    throw error;
  }
};

// ================================================================
// JOB 5: PENDING WITHDRAWAL REMINDER
// Send reminder to hosts about pending withdrawals
// Runs daily at 10:00 AM
// ================================================================

/**
 * Send reminders to hosts about their pending withdrawals
 * Reminds hosts who have withdrawals pending for more than 3 days
 */
export const sendPendingWithdrawalReminders = async () => {
  const startTime = Date.now();
  console.log(`📨 [${new Date().toISOString()}] Sending pending withdrawal reminders...`);

  try {
    // Find pending withdrawals older than 3 days
    const pendingQuery = `
      SELECT 
        wr.id,
        wr.host_id,
        wr.amount,
        wr.reference,
        wr.created_at,
        u.full_name as host_name,
        u.email as host_email
      FROM withdrawal_requests wr
      JOIN users u ON wr.host_id = u.id
      WHERE wr.status = 'pending'
        AND wr.created_at < NOW() - INTERVAL '3 days'
        AND wr.created_at > NOW() - INTERVAL '7 days'
    `;

    const pendingResult = await pool.query(pendingQuery);

    if (pendingResult.rows.length === 0) {
      console.log(`✅ [${new Date().toISOString()}] No pending withdrawals to remind about`);
      return { reminded: 0, message: 'No pending withdrawals to remind about' };
    }

    console.log(`📋 [${new Date().toISOString()}] Found ${pendingResult.rows.length} pending withdrawals to remind about`);

    let reminded = 0;

    for (const withdrawal of pendingResult.rows) {
      try {
        const daysPending = Math.floor((Date.now() - new Date(withdrawal.created_at).getTime()) / (1000 * 60 * 60 * 24));

        await createNotification(
          withdrawal.host_id,
          'withdrawal_reminder',
          'Withdrawal Pending ⏳',
          `Your withdrawal of ₦${parseFloat(withdrawal.amount).toFixed(2)} has been pending for ${daysPending} days. Please contact support if you haven't received it.`,
          {
            withdrawalId: withdrawal.id,
            amount: withdrawal.amount,
            daysPending: daysPending,
            reference: withdrawal.reference
          }
        );

        reminded++;

        console.log(`✅ [${new Date().toISOString()}] Reminder sent for withdrawal ${withdrawal.id}`);

      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Error sending reminder for withdrawal ${withdrawal.id}:`, error.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [${new Date().toISOString()}] Pending withdrawal reminders sent in ${duration}ms`);
    console.log(`📊 Sent ${reminded} reminders`);

    return {
      reminded,
      duration_ms: duration
    };

  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Pending withdrawal reminder error:`, error.message);
    throw error;
  }
};

// ================================================================
// INITIALIZE ALL SCHEDULED JOBS
// ================================================================

/**
 * Initialize and start all scheduled cron jobs
 * Call this function from server.js or app initialization
 */
export const initializeWalletScheduler = () => {
  console.log('🔄 Initializing wallet scheduler...');

  // Job 1: Auto-payout processing - Every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      await processAutoPayouts();
    } catch (error) {
      console.error('❌ Auto-payout scheduler error:', error.message);
    }
  });
  console.log('✅ Auto-payout scheduler: Running every hour');

  // Job 2: Expired payout cleanup - Daily at 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupExpiredPayouts();
    } catch (error) {
      console.error('❌ Expired payout cleanup scheduler error:', error.message);
    }
  });
  console.log('✅ Expired payout cleanup: Running daily at 2:00 AM');

  // Job 3: Withdrawal expiry - Daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      await expirePendingWithdrawals();
    } catch (error) {
      console.error('❌ Withdrawal expiry scheduler error:', error.message);
    }
  });
  console.log('✅ Withdrawal expiry: Running daily at 3:00 AM');

  // Job 4: Daily earnings summary - Daily at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    try {
      await sendDailyEarningsSummary();
    } catch (error) {
      console.error('❌ Daily earnings summary scheduler error:', error.message);
    }
  });
  console.log('✅ Daily earnings summary: Running daily at 9:00 AM');

  // Job 5: Pending withdrawal reminder - Daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    try {
      await sendPendingWithdrawalReminders();
    } catch (error) {
      console.error('❌ Pending withdrawal reminder scheduler error:', error.message);
    }
  });
  console.log('✅ Pending withdrawal reminder: Running daily at 10:00 AM');

  console.log('✅ All wallet schedulers initialized successfully!');
};

// ================================================================
// EXPORTS
// ================================================================

export default {
  // Individual job functions (for manual triggering or testing)
  processAutoPayouts,
  cleanupExpiredPayouts,
  expirePendingWithdrawals,
  sendDailyEarningsSummary,
  sendPendingWithdrawalReminders,
  
  // Initialize all schedulers
  initializeWalletScheduler
};