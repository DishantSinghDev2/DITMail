import User from "@/models/User";
import Organization from "@/models/Organization";
import Plan from "@/models/Plan";
import { connectDB } from "@/lib/db";
import type { User as NextAuthUser } from "next-auth";
import AppPassword from "@/models/AppPassword";
import crypto from "crypto";

/**
 * Handles the initial setup for a brand new user.
 * This function is called when a user signs up for the first time.
 * It creates a default "Free" plan if one doesn't exist, creates a new
 * organization for the user, and updates the user's role to "owner" and
 * links them to the new organization.
 */
export async function handleNewUserOnboarding(user: NextAuthUser) {
  try {
    await connectDB();

    // Find the user in the database to check their status.
    const dbUser = await User.findOne({ email: user.email });

    // Check if the user exists and does not already have an organization.
    // If they do, they are not a new user for onboarding purposes.
    if (!dbUser || dbUser.org_id) {
      console.log(`User ${user.email} is not eligible for new user setup. Skipping.`);
      return;
    }

    console.log(`Performing first-time setup for new user: ${user.email}`);

    // Step 1: Find or create the default "Free" plan.
    let freePlan = await Plan.findOne({ name: "Free" });
    if (!freePlan) {
      console.log("No 'Free' plan found. Creating a default one.");
      freePlan = new Plan({
        name: "Free",
        limits: { users: 2, domains: 1, storage: 5 }, // in GB
        price: 0,
        customizable: false,
        features: ["Basic Email", "1 Domain", "2 User"],
      });
      await freePlan.save();
      console.log(`Default 'Free' plan created with ID: ${freePlan._id}`);
    }

    // Step 2: Create a new organization for the user.
    const orgName = `${user.name}'s Organization`;
    const organization = new Organization({
      name: orgName,
      plan_id: freePlan._id,
    });
    await organization.save();
    console.log(`New organization "${orgName}" created with ID: ${organization._id}`);

    // Step 3: Atomically find and update the user document.
    // This is a more direct way to ensure the user record is updated.
    const updatedUser = await User.findByIdAndUpdate(
      dbUser._id,
      {
        $set: {
          org_id: organization._id,
          role: "owner",
          onboarding: {
            completed: false,
            startedAt: new Date(),
          },
          // By default, the owner does not have mailbox access until setup.
          mailboxAccess: false,
        },
      },
      { new: true } // This option returns the updated document.
    );

    if (!updatedUser) {
      // This is an edge case, but good practice to handle.
      // It means the user was deleted between the initial find and the update.
      throw new Error(`Failed to find and update user ${user.id} during onboarding.`);
    }

    console.log(`Successfully updated user ${updatedUser.email}. They are now the owner of organization ${organization._id}`);

    // +++ STEP 4: CREATE A DEFAULT APP PASSWORD FOR THE WORKER +++
    console.log(`Creating default App Password for user ${updatedUser.email}`);
    // This generates the plain-text password
    const generatedPassword = crypto.randomBytes(16).toString('hex');

    // Create a new AppPassword instance
    const newAppPassword = new AppPassword({
      user_id: updatedUser._id,
      name: 'Default Sending Password',
      // Use the virtual 'password' field to set the plain-text value.
      // Mongoose will automatically call the 'set' function to encrypt it.
      password: generatedPassword,
    });

    // When you save, the encrypted version is stored in the database.
    await newAppPassword.save();
    console.log(`Default App Password created for user ${updatedUser.email}.`);
    // +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  } catch (error) {
    console.error("Error during new user onboarding setup:", error);
    // In a production environment, you might want to add more robust error handling,
    // such as cleaning up the created organization if the user update fails,
    // or sending an alert to an admin.
  }
}