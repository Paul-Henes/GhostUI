# Demo Data Seeding Script
# Seeds realistic compliance scan data for demo purposes
# Run: cd backend && python -m scripts.seed_demo_data

import sys
import os
from datetime import datetime, timezone
import uuid

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_supabase

# Demo scan data with realistic accessibility issues
DEMO_SCANS = [
    {
        "url": "https://www.apple.com",
        "score": 87,
        "status": "completed",
        "issues": [
            {
                "severity": "moderate",
                "wcag_criterion": "1.4.3 Contrast (Minimum)",
                "description": "Some footer links have insufficient color contrast (3.2:1)",
                "location": "Footer navigation links",
                "recommendation": "Darken link color to #0051a5 for 4.5:1 contrast ratio",
                "source": "gemini",
                "confidence": "high",
                "element_html": '<a class="footer-link" style="color: #86868b">Privacy Policy</a>'
            },
            {
                "severity": "minor",
                "wcag_criterion": "2.4.4 Link Purpose (In Context)",
                "description": "Some 'Learn more' links lack context",
                "location": "Product section links",
                "recommendation": "Change to 'Learn more about iPhone 15' for clarity",
                "source": "gemini",
                "confidence": "medium",
                "element_html": '<a href="/iphone">Learn more</a>'
            }
        ]
    },
    {
        "url": "https://www.amazon.com",
        "score": 72,
        "status": "completed",
        "issues": [
            {
                "severity": "serious",
                "wcag_criterion": "1.1.1 Non-text Content",
                "description": "Product images missing alt text",
                "location": "Homepage product carousel",
                "recommendation": "Add descriptive alt text: 'Product name - brief description'",
                "source": "axe-core",
                "confidence": "high",
                "element_html": '<img src="product-123.jpg" class="product-image">'
            },
            {
                "severity": "serious",
                "wcag_criterion": "1.4.3 Contrast (Minimum)",
                "description": "Sale price text has poor contrast (2.9:1)",
                "location": "Red price badges",
                "recommendation": "Use darker red (#C7000B) or add white outline",
                "source": "both",
                "confidence": "high",
                "element_html": '<span class="price-sale" style="color: #cc0c39">$19.99</span>'
            },
            {
                "severity": "moderate",
                "wcag_criterion": "2.4.1 Bypass Blocks",
                "description": "No skip to main content link",
                "location": "Page header",
                "recommendation": "Add skip link: <a href='#main'>Skip to main content</a>",
                "source": "axe-core",
                "confidence": "high",
                "element_html": '<header class="site-header">...</header>'
            }
        ]
    },
    {
        "url": "https://www.gov.uk",
        "score": 95,
        "status": "completed",
        "issues": [
            {
                "severity": "minor",
                "wcag_criterion": "1.4.12 Text Spacing",
                "description": "Text spacing could be improved for readability",
                "location": "Body paragraphs",
                "recommendation": "Increase line-height to 1.5 and paragraph spacing to 2em",
                "source": "gemini",
                "confidence": "medium",
                "element_html": '<p class="body-text">Government services and information...</p>'
            }
        ]
    }
]


def count_issues_by_severity(issues: list) -> dict:
    """Count issues by severity level."""
    counts = {"critical": 0, "serious": 0, "moderate": 0, "minor": 0}
    for issue in issues:
        severity = issue.get("severity", "minor")
        if severity in counts:
            counts[severity] += 1
    return counts


def seed_demo_data():
    """Seed demo compliance scan data into the database."""
    print("Starting demo data seeding...")
    
    try:
        supabase = get_supabase()
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        print("Make sure SUPABASE_URL and SUPABASE_KEY environment variables are set.")
        return False
    
    now = datetime.now(timezone.utc).isoformat()
    seeded_count = 0
    
    for scan_data in DEMO_SCANS:
        url = scan_data["url"]
        print(f"\nProcessing: {url}")
        
        # Check if demo scan already exists for this URL (with NULL user_id)
        try:
            existing = (
                supabase.table("compliance_scans")
                .select("id")
                .eq("url", url)
                .is_("user_id", "null")
                .execute()
            )
        except Exception as e:
            print(f"  Error checking existing scan: {e}")
            continue
        
        # Determine scan_id (reuse existing or create new)
        if existing.data:
            scan_id = existing.data[0]["id"]
            print(f"  Found existing demo scan: {scan_id}")
        else:
            scan_id = str(uuid.uuid4())
            print(f"  Creating new demo scan: {scan_id}")
        
        # Calculate issue counts
        severity_counts = count_issues_by_severity(scan_data["issues"])
        
        # Prepare scan record
        scan_record = {
            "id": scan_id,
            "user_id": None,  # NULL for demo data - visible to all users
            "url": url,
            "status": scan_data["status"],
            "score": scan_data["score"],
            "issue_count": len(scan_data["issues"]),
            "critical_count": severity_counts["critical"],
            "serious_count": severity_counts["serious"],
            "moderate_count": severity_counts["moderate"],
            "minor_count": severity_counts["minor"],
            "progress_percent": 100,
            "progress_message": "Scan completed",
            "completed_at": now,
        }
        
        # Upsert scan record
        try:
            supabase.table("compliance_scans").upsert(scan_record).execute()
            print(f"  Scan record saved (score: {scan_data['score']})")
        except Exception as e:
            print(f"  Error saving scan: {e}")
            continue
        
        # Delete existing issues for this scan
        try:
            supabase.table("compliance_issues").delete().eq("scan_id", scan_id).execute()
        except Exception as e:
            print(f"  Warning: Could not delete existing issues: {e}")
        
        # Insert issues
        issue_records = []
        for issue in scan_data["issues"]:
            issue_record = {
                "id": str(uuid.uuid4()),
                "scan_id": scan_id,
                "severity": issue["severity"],
                "wcag_criterion": issue["wcag_criterion"],
                "description": issue["description"],
                "location": issue.get("location"),
                "recommendation": issue["recommendation"],
                "source": issue.get("source", "gemini"),
                "confidence": issue.get("confidence", "medium"),
                "element_html": issue.get("element_html"),
                "is_resolved": False,
            }
            issue_records.append(issue_record)
        
        if issue_records:
            try:
                supabase.table("compliance_issues").insert(issue_records).execute()
                print(f"  Inserted {len(issue_records)} issues")
            except Exception as e:
                print(f"  Error inserting issues: {e}")
                continue
        
        seeded_count += 1
    
    print(f"\n{'='*50}")
    print(f"Demo data seeding complete!")
    print(f"Seeded {seeded_count}/{len(DEMO_SCANS)} scans")
    print(f"{'='*50}")
    
    return seeded_count == len(DEMO_SCANS)


def clear_demo_data():
    """Remove all demo data (scans with NULL user_id)."""
    print("Clearing demo data...")
    
    try:
        supabase = get_supabase()
    except Exception as e:
        print(f"Failed to connect to Supabase: {e}")
        return False
    
    # Get demo scan IDs
    try:
        demo_scans = (
            supabase.table("compliance_scans")
            .select("id")
            .is_("user_id", "null")
            .execute()
        )
    except Exception as e:
        print(f"Error fetching demo scans: {e}")
        return False
    
    if not demo_scans.data:
        print("No demo data found.")
        return True
    
    scan_ids = [scan["id"] for scan in demo_scans.data]
    print(f"Found {len(scan_ids)} demo scans to delete")
    
    # Delete issues first (cascade should handle this, but being explicit)
    for scan_id in scan_ids:
        try:
            supabase.table("compliance_issues").delete().eq("scan_id", scan_id).execute()
        except Exception as e:
            print(f"Warning: Could not delete issues for {scan_id}: {e}")
    
    # Delete scans
    try:
        supabase.table("compliance_scans").delete().is_("user_id", "null").execute()
        print(f"Deleted {len(scan_ids)} demo scans")
    except Exception as e:
        print(f"Error deleting demo scans: {e}")
        return False
    
    print("Demo data cleared!")
    return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Seed or clear demo data")
    parser.add_argument("--clear", action="store_true", help="Clear demo data instead of seeding")
    args = parser.parse_args()
    
    if args.clear:
        success = clear_demo_data()
    else:
        success = seed_demo_data()
    
    sys.exit(0 if success else 1)
