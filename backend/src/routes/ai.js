const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// OpenRouter API helper
async function callOpenRouter(messages, maxTokens = 1000) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Moving Company AI Platform',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku',
      messages,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// AI Volume Estimator - Estimate volume from room description
router.post('/volume-estimate', authenticate, async (req, res) => {
  try {
    const { rooms, propertyType, bedrooms, photos } = req.body;

    const prompt = `You are an expert moving company estimator. Based on the following property details, estimate the total volume in cubic feet and weight in pounds.

Property Type: ${propertyType}
Bedrooms: ${bedrooms}
Rooms: ${JSON.stringify(rooms || [])}

Provide your response in JSON format ONLY with no additional text:
{
  "estimatedVolume": <number in cubic feet>,
  "estimatedWeight": <number in pounds>,
  "confidence": <number between 0 and 1>,
  "breakdown": {
    "baseVolume": <number>,
    "roomAdjustments": <number>
  },
  "recommendations": "<brief text about packing considerations>"
}`;

    const aiResponse = await callOpenRouter([
      { role: 'user', content: prompt }
    ]);

    let result;
    try {
      // Try to parse the JSON response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (parseError) {
      // Fallback to calculation-based estimation
      const baseVolumes = {
        APARTMENT: { 1: 300, 2: 500, 3: 800, 4: 1100 },
        HOUSE: { 1: 400, 2: 700, 3: 1000, 4: 1400, 5: 1800 },
        CONDO: { 1: 350, 2: 550, 3: 850, 4: 1150 },
        TOWNHOUSE: { 1: 400, 2: 650, 3: 950, 4: 1300 },
      };

      let estimatedVolume = baseVolumes[propertyType]?.[bedrooms] || 500;

      if (rooms && Array.isArray(rooms)) {
        const roomMultipliers = {
          living_room: 150, bedroom: 100, kitchen: 80, dining_room: 100,
          bathroom: 20, garage: 200, basement: 150, office: 80, attic: 100,
        };
        rooms.forEach((room) => {
          const multiplier = roomMultipliers[room.type?.toLowerCase()] || 50;
          const densityMultiplier = room.itemDensity === 'high' ? 1.5 : room.itemDensity === 'low' ? 0.7 : 1;
          estimatedVolume += multiplier * densityMultiplier;
        });
      }

      result = {
        estimatedVolume: Math.round(estimatedVolume),
        estimatedWeight: Math.round(estimatedVolume * 7),
        confidence: 0.75,
        breakdown: {
          baseVolume: baseVolumes[propertyType]?.[bedrooms] || 500,
          roomAdjustments: estimatedVolume - (baseVolumes[propertyType]?.[bedrooms] || 500),
        },
        recommendations: 'Consider scheduling an on-site survey for more accurate estimates.',
      };
    }

    // Save estimate
    await prisma.aIVolumeEstimate.create({
      data: {
        photoUrl: photos?.[0] || '',
        roomType: propertyType,
        estimatedVolume: result.estimatedVolume,
        confidence: result.confidence,
        itemsDetected: rooms ? rooms.map((r) => r.type) : [],
        analysis: result.recommendations || '',
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Volume estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate volume' });
  }
});

// AI Quote Generator
router.post('/quote-generate', authenticate, async (req, res) => {
  try {
    const {
      volume, moveType, distance, floors, hasElevator,
      packingNeeded, specialItems, moveDate,
    } = req.body;

    // Get company rates
    const settings = await prisma.companySettings.findFirst();
    const laborRate = settings?.laborRate || 50;
    const packingRate = settings?.packingRate || 40;
    const travelRate = settings?.travelRate || 35;
    const minHours = settings?.minHours || 2;

    const prompt = `You are an expert moving company quote generator. Generate a detailed quote based on:

Volume: ${volume} cubic feet
Move Type: ${moveType}
Distance: ${distance} miles
Floors: ${floors} (Elevator: ${hasElevator ? 'Yes' : 'No'})
Packing Needed: ${packingNeeded ? 'Yes' : 'No'}
Special Items: ${JSON.stringify(specialItems || [])}
Move Date: ${moveDate || 'Not specified'}

Base Rates:
- Labor: $${laborRate}/hr per person
- Travel: $${travelRate}/hr per person
- Packing: $${packingRate}/hr per person
- Minimum hours: ${minHours}

Calculate and provide response in JSON format ONLY:
{
  "estimatedHours": <number>,
  "crewSize": <number>,
  "laborRate": ${laborRate},
  "laborTotal": <number>,
  "travelHours": <number>,
  "travelRate": ${travelRate},
  "travelTotal": <number>,
  "packingHours": <number>,
  "packingRate": ${packingRate},
  "packingTotal": <number>,
  "specialItemsCharge": <number>,
  "subtotal": <number>,
  "total": <number>,
  "peakMultiplier": <number>,
  "notes": "<any special considerations>"
}`;

    const aiResponse = await callOpenRouter([
      { role: 'user', content: prompt }
    ]);

    let quote;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      quote = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (parseError) {
      // Fallback calculation
      let baseHours = volume / 150;
      if (floors > 1 && !hasElevator) baseHours *= 1 + (floors - 1) * 0.15;

      let crewSize = 2;
      if (volume > 500) crewSize = 3;
      if (volume > 1000) crewSize = 4;
      if (volume > 1500) crewSize = 5;

      let travelHours = moveType === 'LOCAL' ? Math.min(distance / 30, 2) : distance / 50;
      let packingHours = packingNeeded ? volume / 200 : 0;

      let peakMultiplier = 1;
      if (moveDate) {
        const date = new Date(moveDate);
        const dayOfWeek = date.getDay();
        const month = date.getMonth();
        if (dayOfWeek === 0 || dayOfWeek === 6) peakMultiplier = 1.1;
        if (month >= 5 && month <= 8) peakMultiplier *= 1.1;
      }

      const laborTotal = Math.max(baseHours, minHours) * crewSize * laborRate * peakMultiplier;
      const travelTotal = travelHours * travelRate * crewSize;
      const packingTotal = packingHours * packingRate * crewSize;
      const subtotal = laborTotal + travelTotal + packingTotal;

      quote = {
        estimatedHours: Math.round(baseHours * 10) / 10,
        crewSize,
        laborRate,
        laborTotal: Math.round(laborTotal),
        travelHours: Math.round(travelHours * 10) / 10,
        travelRate,
        travelTotal: Math.round(travelTotal),
        packingHours: Math.round(packingHours * 10) / 10,
        packingRate,
        packingTotal: Math.round(packingTotal),
        specialItemsCharge: 0,
        subtotal: Math.round(subtotal),
        total: Math.round(subtotal),
        peakMultiplier,
        notes: 'Estimate based on standard calculations',
      };
    }

    // Save quote history
    await prisma.aIQuoteHistory.create({
      data: {
        moveDetails: JSON.stringify(req.body),
        generatedQuote: quote.total,
        factors: JSON.stringify({ volume, crewSize: quote.crewSize, peakMultiplier: quote.peakMultiplier }),
        confidence: 0.85,
      },
    });

    res.json({
      quote,
      confidence: 0.85,
      factors: {
        peakMultiplier: quote.peakMultiplier,
        volumeCategory: volume < 500 ? 'small' : volume < 1000 ? 'medium' : 'large',
      },
    });
  } catch (error) {
    console.error('Quote generate error:', error);
    res.status(500).json({ error: 'Failed to generate quote' });
  }
});

// AI Crew Optimizer
router.post('/crew-optimize', authenticate, async (req, res) => {
  try {
    const { jobId, date, requiredCrewSize, requiredSkills } = req.body;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const allCrew = await prisma.crewMember.findMany({
      where: { isActive: true },
    });

    const assignedCrew = await prisma.crewAssignment.findMany({
      where: {
        job: {
          moveDate: { gte: targetDate, lt: nextDay },
          status: { not: 'CANCELLED' },
        },
      },
    });

    const assignedIds = new Set(assignedCrew.map((a) => a.crewMemberId));
    const availableCrew = allCrew.filter((c) => !assignedIds.has(c.id));

    const prompt = `You are an expert crew scheduler for a moving company. Select the optimal crew for a job.

Available Crew Members:
${JSON.stringify(availableCrew.map(c => ({
  id: c.id,
  name: `${c.firstName} ${c.lastName}`,
  role: c.role,
  skills: c.skills,
  hourlyRate: c.hourlyRate,
})), null, 2)}

Requirements:
- Required crew size: ${requiredCrewSize}
- Required skills: ${JSON.stringify(requiredSkills || [])}
- Must have at least one DRIVER
- Prefer to have one CREW_LEAD

Provide response in JSON format ONLY:
{
  "selectedCrewIds": ["id1", "id2", ...],
  "reasoning": "<brief explanation>",
  "hasDriver": <boolean>,
  "hasCrewLead": <boolean>,
  "confidence": <number 0-1>
}`;

    let result;
    try {
      const aiResponse = await callOpenRouter([
        { role: 'user', content: prompt }
      ]);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      // Fallback to manual selection
      const selectedCrew = [];
      let hasDriver = false;
      let hasCrewLead = false;

      // Sort by role priority
      const sortedCrew = [...availableCrew].sort((a, b) => {
        const priority = { DRIVER: 1, CREW_LEAD: 2, MOVER: 3, PACKER: 4 };
        return (priority[a.role] || 5) - (priority[b.role] || 5);
      });

      for (const crew of sortedCrew) {
        if (selectedCrew.length >= requiredCrewSize) break;
        if (!hasDriver && crew.role === 'DRIVER') {
          selectedCrew.push(crew);
          hasDriver = true;
        } else if (!hasCrewLead && crew.role === 'CREW_LEAD') {
          selectedCrew.push(crew);
          hasCrewLead = true;
        } else if (selectedCrew.length < requiredCrewSize) {
          selectedCrew.push(crew);
        }
      }

      result = {
        selectedCrewIds: selectedCrew.map(c => c.id),
        hasDriver,
        hasCrewLead,
        confidence: selectedCrew.length >= requiredCrewSize ? 0.9 : 0.6,
      };
    }

    const recommendedCrew = availableCrew
      .filter(c => result.selectedCrewIds?.includes(c.id))
      .map(crew => ({
        ...crew,
        optimizationScore: crew.role === 'DRIVER' ? 90 : crew.role === 'CREW_LEAD' ? 85 : 70,
      }));

    res.json({
      recommendedCrew: recommendedCrew.length > 0 ? recommendedCrew : availableCrew.slice(0, requiredCrewSize),
      totalAvailable: availableCrew.length,
      optimizationFactors: {
        hasDriver: result.hasDriver,
        hasCrewLead: result.hasCrewLead,
        skillsMatched: requiredSkills?.length || 0,
      },
      confidence: result.confidence || 0.8,
      reasoning: result.reasoning,
    });
  } catch (error) {
    console.error('Crew optimize error:', error);
    res.status(500).json({ error: 'Failed to optimize crew' });
  }
});

// AI Route Planner
router.post('/route-plan', authenticate, async (req, res) => {
  try {
    const { origin, destination, stops } = req.body;

    const prompt = `You are a route planning expert. Plan an optimal moving route.

Origin: ${origin}
Destination: ${destination}
${stops?.length > 0 ? `Stops: ${JSON.stringify(stops)}` : 'No additional stops'}

Provide response in JSON format ONLY with realistic estimates:
{
  "totalDistance": <number in miles>,
  "totalDuration": <number in minutes>,
  "segments": [
    {"from": "<location>", "to": "<location>", "distance": <miles>, "duration": <minutes>}
  ],
  "suggestedDepartureTime": "<time like 7:00 AM>",
  "trafficCondition": "<light/moderate/heavy>",
  "fuelEstimate": <gallons>,
  "tips": "<any route tips>"
}`;

    let result;
    try {
      const aiResponse = await callOpenRouter([
        { role: 'user', content: prompt }
      ]);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      // Fallback estimation
      const baseDistance = 25 + (stops?.length || 0) * 5;
      result = {
        totalDistance: baseDistance,
        totalDuration: baseDistance * 2,
        segments: [
          { from: origin, to: destination, distance: baseDistance, duration: baseDistance * 2 }
        ],
        suggestedDepartureTime: '7:00 AM',
        trafficCondition: 'moderate',
        fuelEstimate: Math.round(baseDistance / 10),
        tips: 'Allow extra time for loading and unloading.',
      };
    }

    res.json({
      route: {
        totalDistance: result.totalDistance,
        totalDuration: result.totalDuration,
        segments: result.segments,
      },
      estimatedDriveTime: result.totalDuration,
      estimatedDistance: result.totalDistance,
      trafficCondition: result.trafficCondition,
      suggestedDepartureTime: result.suggestedDepartureTime,
      fuelEstimate: result.fuelEstimate,
      tips: result.tips,
    });
  } catch (error) {
    console.error('Route plan error:', error);
    res.status(500).json({ error: 'Failed to plan route' });
  }
});

// AI Review Response Generator
router.post('/review-response', authenticate, async (req, res) => {
  try {
    const { reviewText, rating, customerName } = req.body;

    const prompt = `You are a professional customer service representative for a moving company. Generate a thoughtful, professional response to this customer review.

Customer Name: ${customerName || 'Valued Customer'}
Rating: ${rating} out of 5 stars
Review: "${reviewText || 'No review text provided'}"

Write a personalized response that:
1. Thanks the customer appropriately based on the rating
2. Addresses any specific points they mentioned
3. If rating is low (1-2), apologize sincerely and offer to make things right
4. If rating is medium (3), acknowledge their feedback constructively
5. If rating is high (4-5), express genuine gratitude

Keep the response professional, warm, and under 200 words.

Provide response in JSON format ONLY:
{
  "suggestedResponse": "<the response text>",
  "tone": "<grateful/neutral/apologetic>",
  "keyPointsAddressed": ["point1", "point2", ...]
}`;

    let result;
    try {
      const aiResponse = await callOpenRouter([
        { role: 'user', content: prompt }
      ], 500);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      // Fallback responses
      const name = customerName || 'Valued Customer';
      let response, tone;

      if (rating >= 4) {
        tone = 'grateful';
        response = `Dear ${name},\n\nThank you so much for your wonderful ${rating}-star review! We're thrilled to hear that you had a positive experience with our moving services.\n\nYour kind words mean the world to our team. We take great pride in making moves as smooth and stress-free as possible.\n\nThank you for choosing us, and we hope to assist you again in the future!\n\nBest regards,\nThe Moving Company Team`;
      } else if (rating === 3) {
        tone = 'neutral';
        response = `Dear ${name},\n\nThank you for taking the time to share your feedback. We appreciate your honest review and are always looking for ways to improve our services.\n\nWe'd love to hear more about how we can better serve you in the future. Please feel free to reach out to us directly.\n\nThank you for choosing us!\n\nBest regards,\nThe Moving Company Team`;
      } else {
        tone = 'apologetic';
        response = `Dear ${name},\n\nWe sincerely apologize that your experience with us did not meet your expectations. Your feedback is incredibly important to us, and we take your concerns very seriously.\n\nWe would greatly appreciate the opportunity to make things right. Please contact our customer service team directly so we can address your concerns personally.\n\nSincerely,\nThe Moving Company Team`;
      }

      result = {
        suggestedResponse: response,
        tone,
        keyPointsAddressed: ['Acknowledgment of review', 'Expression of gratitude/concern', 'Call to action'],
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Review response error:', error);
    res.status(500).json({ error: 'Failed to generate review response' });
  }
});

// AI Customer Communication Generator
router.post('/communication-generate', authenticate, async (req, res) => {
  try {
    const { type, context, customerName, jobDetails } = req.body;

    const prompt = `You are a professional customer communication specialist for a moving company. Generate a ${type} message for a customer.

Message Type: ${type}
Customer Name: ${customerName || 'Valued Customer'}
Job Details: ${JSON.stringify(jobDetails || {})}
Additional Context: ${context || 'None'}

Create a professional, friendly message appropriate for the type:
- reminder: Remind about upcoming move
- confirmation: Confirm booking details
- status_update: Provide status update on moving day
- follow_up: Post-move thank you and feedback request

Keep it concise and professional.

Provide response in JSON format ONLY:
{
  "generatedMessage": "<the message text>",
  "messageType": "${type}",
  "suggestedChannel": "<EMAIL or SMS>"
}`;

    let result;
    try {
      const aiResponse = await callOpenRouter([
        { role: 'user', content: prompt }
      ], 500);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      // Fallback templates
      const name = customerName || 'Valued Customer';
      const templates = {
        reminder: `Hi ${name},\n\nThis is a friendly reminder about your upcoming move scheduled for ${jobDetails?.moveDate || 'soon'}.\n\nPlease ensure all items are packed and ready. Our team will arrive at ${jobDetails?.startTime || 'the scheduled time'}.\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest,\nYour Moving Team`,
        confirmation: `Dear ${name},\n\nGreat news! Your move has been confirmed for ${jobDetails?.moveDate || 'the scheduled date'}.\n\nHere are your booking details:\n- Move Date: ${jobDetails?.moveDate || 'TBD'}\n- From: ${jobDetails?.origin || 'TBD'}\n- To: ${jobDetails?.destination || 'TBD'}\n\nWe look forward to making your move a success!\n\nBest regards,\nYour Moving Team`,
        status_update: `Hi ${name},\n\nQuick update on your move:\n\n${context || 'Your move is progressing smoothly.'}\n\nWe'll keep you posted on any further developments.\n\nBest,\nYour Moving Team`,
        follow_up: `Dear ${name},\n\nWe hope you're settling into your new place!\n\nThank you for choosing us for your recent move. We'd love to hear about your experience. Your feedback helps us continue to improve.\n\nIf you have a moment, please consider leaving us a review.\n\nWarmly,\nYour Moving Team`,
      };

      result = {
        generatedMessage: templates[type] || templates.status_update,
        messageType: type,
        suggestedChannel: type === 'reminder' || type === 'status_update' ? 'SMS' : 'EMAIL',
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Communication generate error:', error);
    res.status(500).json({ error: 'Failed to generate communication' });
  }
});

// AI Inventory Identifier
router.post('/inventory-identify', authenticate, async (req, res) => {
  try {
    const { description, room } = req.body;

    const prompt = `You are an expert moving inventory specialist. Analyze this item description and categorize it.

Item Description: ${description}
Room: ${room || 'Unknown'}

Provide response in JSON format ONLY:
{
  "name": "<standardized item name>",
  "category": "<one of: FURNITURE, ELECTRONICS, APPLIANCE, BOXES, FRAGILE, ARTWORK, ANTIQUE, PIANO, POOL_TABLE, GYM_EQUIPMENT, OUTDOOR, GARAGE, OTHER>",
  "estimatedVolume": <cubic feet>,
  "estimatedWeight": <pounds>,
  "isFragile": <boolean>,
  "requiresCrating": <boolean>,
  "specialHandling": "<any special handling notes or null>"
}`;

    let result;
    try {
      const aiResponse = await callOpenRouter([
        { role: 'user', content: prompt }
      ], 300);
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch (error) {
      result = {
        name: description,
        category: 'OTHER',
        estimatedVolume: 10,
        estimatedWeight: 50,
        isFragile: false,
        requiresCrating: false,
        specialHandling: null,
      };
    }

    res.json(result);
  } catch (error) {
    console.error('Inventory identify error:', error);
    res.status(500).json({ error: 'Failed to identify inventory item' });
  }
});

module.exports = router;
