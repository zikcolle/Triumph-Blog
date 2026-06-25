// Deno Edge Function to handle comment reply notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    console.log("Database webhook payload received:", JSON.stringify(payload))

    const record = payload.record
    if (!record) {
      return new Response('No record found in payload', { status: 400 })
    }

    const { parent_id, post_id, name, comment } = record

    // If there is no parent_id, it is a top-level comment. No notification needed.
    if (!parent_id) {
      return new Response('Skipping: Top-level comment (no parent_id)', { status: 200 })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const resendApiKey = Deno.env.get("RESEND_API_KEY")

    if (!supabaseUrl || !supabaseServiceRole) {
      return new Response('Missing Supabase environment configurations', { status: 500 })
    }

    if (!resendApiKey) {
      return new Response('Missing RESEND_API_KEY environment configuration', { status: 500 })
    }

    // 1. Fetch parent comment to get recipient email & details
    const queryUrl = `${supabaseUrl}/rest/v1/comments?id=eq.${parent_id}&select=email,name`
    const parentRes = await fetch(queryUrl, {
      headers: {
        'apikey': supabaseServiceRole,
        'Authorization': `Bearer ${supabaseServiceRole}`
      }
    })

    if (!parentRes.ok) {
      const err = await parentRes.text()
      console.error("Failed to query parent comment:", err)
      return new Response(`Failed to query parent comment: ${err}`, { status: 500 })
    }

    const parentComments = await parentRes.json()
    const parentComment = parentComments[0]

    if (!parentComment) {
      return new Response('Parent comment not found in database', { status: 200 })
    }

    // If parent commenter did not supply an email, skip notification
    if (!parentComment.email) {
      return new Response('Parent commenter has no email address. Skipping email alert.', { status: 200 })
    }

    console.log(`Sending email alert to: ${parentComment.email} for reply from: ${name}`)

    // 2. Dispatch email notification using Resend API
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Tryumph Magazine <onboarding@resend.dev>", // Replace with your verified sender domain once configured
        to: [parentComment.email],
        subject: `New reply from ${name} on Tryumph Magazine`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #004D40; margin-top: 0;">New Reply to Your Comment</h2>
            <p>Hi <strong>${parentComment.name}</strong>,</p>
            <p><strong>${name}</strong> has replied to your discussion on Tryumph Magazine:</p>
            <div style="background-color: #f9f9f9; border-left: 4px solid #004D40; padding: 15px; margin: 15px 0; font-style: italic; color: #333333; border-radius: 4px;">
              "${comment}"
            </div>
            <p style="margin-top: 25px;">
              <a href="https://tryumph-magazine.netlify.app/post.html?id=${post_id}" style="background-color: #004D40; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View Discussion</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0 15px 0;" />
            <p style="font-size: 0.8rem; color: #888;">This is an automated notification from Tryumph Magazine. You received this because you filled in your email address while commenting.</p>
          </div>
        `
      })
    })

    if (!emailRes.ok) {
      const emailErr = await emailRes.text()
      console.error("Resend API rejected email request:", emailErr)
      return new Response(`Resend API Error: ${emailErr}`, { status: 500 })
    }

    return new Response('Notification email dispatched successfully!', { status: 200 })

  } catch (err: any) {
    console.error("Runtime exception inside edge function:", err.message)
    return new Response(`Internal Server Error: ${err.message}`, { status: 500 })
  }
})
