import { unstable_cache } from 'next/cache';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Domain, {IDomain} from '@/models/Domain';
import Message from '@/models/Message';
import { serialize } from '@/lib/utils';
import Activity from '@/models/Activity'; // <-- Import the new Activity 
import { ObjectId } from 'mongodb';

/**
 * Fetches aggregate statistics for an organization.
 */
export const getOrganizationStats = unstable_cache(
  async (orgId: string) => {
    await connectDB();
    
    const [userCount, domainCount, totalEmails] = await Promise.all([
      User.countDocuments({ org_id: orgId }),
      Domain.countDocuments({ org_id: orgId }),
      Message.countDocuments({ org_id: orgId }),
    ]);

    const storageUsed = 7.8;
    const storageLimit = 15;

    return { userCount, domainCount, totalEmails, storageUsed, storageLimit };
  },
  ['org-stats'],
  // This function uses a dynamic tag correctly
  { tags: (orgId) => [`org:${orgId}:stats`], revalidate: 300 }
);

/**
 * Fetches all users within an organization, with optional search.
 */
export const getOrganizationUsers = unstable_cache(
  async (orgId: string, searchQuery: string = '') => {
    await connectDB();

    const query: any = { org_id: orgId };
    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'i');
      query.$or = [{ name: regex }, { email: regex }];
    }
    
    const users = await User.find(query).sort({ name: 1 }).lean();
    return serialize(users);
  },
  ['org-users'],
  // ✅ THE FIX: Use a function to create dynamic tags
  { tags: (orgId, searchQuery) => [`org:${orgId}:users`, `org:${orgId}:users:${searchQuery}`] }
);

/**
 * Fetches recent activity for an organization.
 */
export const getRecentActivity = unstable_cache(
  async (orgId: string) => {
    console.log(`Fetching recent activity for organization: ${orgId}`);
    await connectDB(); // Ensure database connection

    try {
      // Fetch recent activities, limit to a certain number (e.g., 5-10 for a dashboard)
      // Sort by timestamp in descending order to get the most recent first.
      const activities = await Activity.find({ org_id: orgId })
        .sort({ timestamp: -1 }) // Most recent first
        .limit(10) // Limit to 10 recent activities
        .lean(); // Use .lean() for plain JavaScript objects

      // Serialize the data to ensure it's safe to pass to client components
      return serialize(activities);

    } catch (error) {
      console.error(`Error fetching recent activity for org ${orgId}:`, error);
      return []; // Return an empty array on error
    }
  },
  ['recent-activity'],
  {
    // The tags function correctly receives orgId as an argument
    tags: (orgId) => [`org:${orgId}:activity`],
    revalidate: 120 // Revalidate every 2 minutes
  }
);


// --- New function for system health ---
export const getSystemHealth = unstable_cache(
  async () => {
    // In a real app, this would check database connections, API status, etc.
    console.log('Fetching system health...');
    return {
      database: 'ok',
      email_service: 'ok',
      api_status: 'operational',
    };
  },
  ['system-health'],
  { revalidate: 60 } // Revalidate every minute
);

export const getOrganizationDomains = unstable_cache(
  async (orgId: string) => {
    console.log(`Fetching domains for org: ${orgId}`);
    await connectDB();
    const domains = await Domain.find({ org_id: new ObjectId(orgId) }).lean();
    // Serialize to ensure plain objects and proper date/ObjectId conversion
    return serialize(domains) as IDomain[];
  },
  ['org-domains'],
  { tags: (orgId) => [`org:${orgId}:domains`], revalidate: 300 } // Revalidate every 5 mins
);
