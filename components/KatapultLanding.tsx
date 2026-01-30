"use client";

import Script from "next/script";
import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";
import PreApprovalModal from "@/components/PreApprovalModal";
import { toast } from "sonner";
import { apiService } from "@/services/api";
import { launchFinancing } from "@/services/lendproService";

declare global {
  interface Window {
    Autosync?: any;
    autosyncInstance?: any;
  }
}

const AUTOSYNC_KEY = "v3C4lXEncDytIJUmPnrC";
const AUTOSYNC_CONTAINER_ID = "autosync-visualizer";

export default function KatapultLanding() {
  const [ready, setReady] = useState(false);
  const [paymentSelectionOpen, setPaymentSelectionOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [preApprovalOpen, setPreApprovalOpen] = useState(false);
  const [launchURL, setLaunchURL] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'financing' | 'card' | null>(null);
  const initialized = useRef(false);
  const currentSelectionRef = useRef<any>(null); // Store current product selection

  // Show payment selection when BUY is clicked
  const handleBuyClick = useCallback(async () => {
    console.log("[Katapult] BUY clicked - showing payment selection");
    
    try {
      // Get current selection from Autosync
      let data = currentSelectionRef.current;
      
      // Try to get from Autosync instance if not in ref
      if (!data && window.autosyncInstance) {
        if (typeof window.autosyncInstance.getQuote === 'function') {
          data = window.autosyncInstance.getQuote();
        } else if (typeof window.autosyncInstance.getCurrentSelection === 'function') {
          data = window.autosyncInstance.getCurrentSelection();
        }
      }
      
      if (!data || (!data.wheels && !data.tires)) {
        toast.info('Please select products in the visualizer first');
        return;
      }
      
      // Show payment method selection
      setPaymentSelectionOpen(true);
    } catch (error) {
      console.error("[Katapult] Error handling BUY click:", error);
      toast.error('Please try selecting products first.');
    }
  }, []);

  // Launch financing after payment method is selected
  const launchFinancingWithSelection = useCallback(async () => {
    console.log("[Katapult] Launching financing with method:", paymentMethod);
    
    try {
      const data = currentSelectionRef.current;
      
      if (!data || (!data.wheels && !data.tires)) {
        toast.info('Please select products in the visualizer first');
        return;
      }
      
      // Calculate total from products
      let totalAmount = 0;
      const lineItems: any[] = [];
      
      // Process Tires
      if (data.tires && Array.isArray(data.tires)) {
        for (const tire of data.tires) {
          const price = await apiService.getProductPrice(tire.partNumber, 'tire');
          const quantity = tire.quantity || 4;
          totalAmount += price * quantity;
          
          lineItems.push({
            sku: tire.partNumber,
            description: `${tire.brand || ''} ${tire.model || tire.partNumber} - ${tire.width}/${tire.ratio}R${tire.diameter}`,
            quantity: quantity,
            unitPrice: price,
            totalPrice: price * quantity,
          });
        }
      }

      // Process Wheels
      if (data.wheels && Array.isArray(data.wheels)) {
        for (const wheel of data.wheels) {
          const price = await apiService.getProductPrice(wheel.partNumber, 'wheel');
          const quantity = wheel.quantity || 4;
          totalAmount += price * quantity;
          
          lineItems.push({
            sku: wheel.partNumber,
            description: `${wheel.brand || ''} ${wheel.model || wheel.partNumber} - ${wheel.diameter}x${wheel.width}`,
            quantity: quantity,
            unitPrice: price,
            totalPrice: price * quantity,
          });
        }
      }
      
      console.log('[Katapult] Calculated total:', totalAmount);
      console.log('[Katapult] Line items:', lineItems);
      
      if (paymentMethod === 'financing') {
        // Launch LendPro financing
        setIsSubmitting(true);
        setPaymentSelectionOpen(false);
        
        const result = await launchFinancing({
          orderId: `ORDER-${Date.now()}`,
          totalAmount: totalAmount,
          subtotal: totalAmount,
          tax: 0,
          fees: 0,
          shipping: 0,
          customer: {
            firstName: 'Guest',
            lastName: 'Customer',
            email: 'guest@customer.com',
            mobilePhone: '5555555555',
            streetAddress: '123 Main St',
            city: 'City',
            state: 'PA',
            zipCode: '12345',
          },
          items: lineItems.map(item => ({
            name: item.description,
            price: item.unitPrice,
            quantity: item.quantity,
          })),
        });
        
        setIsSubmitting(false);
        
        if (result.launchURL) {
          console.log('[Katapult] LendPro launch successful, opening lightbox');
          setLaunchURL(result.launchURL);
          setCheckoutOpen(true);
        } else {
          toast.error('Failed to launch financing');
        }
      } else if (paymentMethod === 'card') {
        // Show credit card payment form
        setPaymentSelectionOpen(false);
        toast.info('Credit card payment coming soon!');
        // TODO: Integrate credit card payment
      }
    } catch (error) {
      console.error("[Katapult] Error launching financing:", error);
      toast.error('Failed to launch financing. Please try again.');
      setIsSubmitting(false);
    }
  }, [paymentMethod]);

  // Handle DETAILS button click - show product details
  const handleDetailsClick = useCallback((e?: MouseEvent) => {
    console.log('[Katapult] DETAILS button clicked');
    
    // Try to get current product data
    try {
      if (window.autosyncInstance && typeof window.autosyncInstance.getCurrentProduct === 'function') {
        const product = window.autosyncInstance.getCurrentProduct();
        if (product) {
          toast.info(`Viewing details for ${product.brand || ''} ${product.model || ''}`);
          // Could open a details modal here
        }
      } else {
        toast.info('Product details are shown in the visualizer');
      }
    } catch (error) {
      console.error('[Katapult] Error handling DETAILS click:', error);
      toast.info('Product details are shown in the visualizer');
    }
  }, []);


  // Initialize the widget after the script loads
  const initAutosync = useCallback(() => {
    if (initialized.current) return;
    if (!window.Autosync) return;

    initialized.current = true;

    window.autosyncInstance = new window.Autosync({
      id: AUTOSYNC_CONTAINER_ID,
      key: AUTOSYNC_KEY,
      adaptiveHeight: false,
      disableQuoteForm: true, // Disable Autosync's form - we show LendPro directly
      homeStyle: null,
      productSegment: ['vehicles', 'wheels'],
      scrollBar: false,
      startPage: null,
      widget: false,
      onEvent: function({ event, data }: { event: string, data: any }) {
        console.log('[Katapult] AutoSync Event:', event, data);
        
        // Store product selection data when products are selected
        if (data && (data.wheels || data.tires || data.vehicle)) {
          currentSelectionRef.current = data;
          console.log('[Katapult] Stored selection:', data);
        }
        
        // When user submits quote OR clicks BUY, show payment selection
        if (event === 'submitQuote' || event === 'buy' || event === 'buyClick' || event === 'addToCart') {
          console.log('[Katapult] Quote/BUY event detected - showing payment selection');
          // Use the data from the event or stored selection
          if (data && (data.wheels || data.tires)) {
            currentSelectionRef.current = data;
          }
          handleBuyClick();
        }
      },
    });

    setReady(true);
  }, [handleBuyClick]);

  // Inject pre-approval button inside the visualizer
  const injectPreApprovalButton = useCallback(() => {
    const container = document.getElementById(AUTOSYNC_CONTAINER_ID);
    if (!container) return;

    // Check if button already exists
    if (container.querySelector('.katapult-preapproval-btn')) return;

    // Create button element
    const button = document.createElement('button');
    button.className = 'katapult-preapproval-btn';
    button.style.cssText = `
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 9999;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      transition: all 0.3s ease;
      cursor: pointer;
      background: linear-gradient(to bottom right, #2563eb, #1e40af, #1e3a8a);
      border-radius: 0.5rem;
      padding: 12px 16px;
      border: 0;
      color: white;
      font-weight: bold;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      min-width: 180px;
    `;
    button.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 24px; height: 24px; background: rgba(255, 255, 255, 0.2); border-radius: 9999px; display: flex; align-items: center; justify-content: center;">
          <span style="color: white; font-weight: bold; font-size: 14px;">K</span>
        </div>
        <span style="font-size: 14px;">See if You Pre-Qualify</span>
      </div>
      <span style="font-size: 12px; color: rgba(255, 255, 255, 0.9); font-weight: normal;">
        Multiple Providers • Regardless of Credit
      </span>
    `;
    button.onmouseenter = () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 25px 50px -12px rgba(37, 99, 235, 0.5)';
    };
    button.onmouseleave = () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    };
    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setPreApprovalOpen(true);
    };

    // Append to visualizer container
    container.appendChild(button);
    console.log('[Katapult] Pre-approval button injected successfully');
  }, [setPreApprovalOpen]);

  // Removed button interception - let Autosync work naturally
  // This function is now a no-op placeholder
  const interceptBuyDetailsButtons = useCallback(() => {
    console.log('[Katapult] Not intercepting buttons - letting Autosync work naturally');
    return; // Exit early - don't intercept
    const container = document.getElementById(AUTOSYNC_CONTAINER_ID);
    if (!container) {
      console.log('[Katapult] Container not found for button interception');
      return;
    }
    
    console.log('[Katapult] Setting up button interception');
    
    // Also check for iframes - Autosync might render in an iframe
    const containerIframes = container.querySelectorAll('iframe');
    const docIframes = document.querySelectorAll('iframe');
    console.log(`[Katapult] Found ${containerIframes.length} iframes in container, ${docIframes.length} total iframes`);
    
    // Function to search iframe content for buttons
    const searchIframeButtons = () => {
      docIframes.forEach((iframe: any, index: number) => {
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc && iframeDoc.body) {
            const iframeButtons = iframeDoc.querySelectorAll('button, a[role="button"], [onclick], [class*="button"], [class*="btn"]');
            console.log(`[Katapult] Iframe ${index} has ${iframeButtons.length} buttons`);
            
            // Log first few buttons from iframe for debugging
            iframeButtons.forEach((btn: any, btnIndex: number) => {
              if (btnIndex < 3) {
                const text = (btn.textContent || btn.innerText || '').toUpperCase().trim();
                console.log(`[Katapult] Iframe button ${btnIndex}: text="${text.substring(0, 50)}"`);
              }
            });
            
            // Search for BUY/DETAILS buttons in iframe
            let buyCount = 0;
            let detailsCount = 0;
            
            iframeButtons.forEach((btn: any) => {
              const text = (btn.textContent || btn.innerText || '').toUpperCase().trim();
              const ariaLabel = (btn.getAttribute('aria-label') || '').toUpperCase();
              const className = (btn.className || '').toUpperCase();
              const id = (btn.id || '').toUpperCase();
              
              if ((text === 'BUY' || text.includes('BUY') || ariaLabel.includes('BUY') || className.includes('BUY') || id.includes('BUY')) && !btn.dataset.katapultHandled) {
                btn.dataset.katapultHandled = 'true';
                buyCount++;
                console.log(`[Katapult] ✓ Found BUY button #${buyCount} in iframe:`, { text, ariaLabel, className, id });
                
                // Intercept BUY button to prevent Autosync's quote form and use our checkout
                btn.addEventListener('click', (e: MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  console.log('[Katapult] BUY button clicked in iframe');
                  handleBuyClick(e);
                  return false;
                }, true); // Use capture phase to intercept before Autosync
              }
              
              if ((text === 'DETAILS' || text.includes('DETAILS') || ariaLabel.includes('DETAILS') || ariaLabel.includes('DETAIL') || className.includes('DETAILS') || className.includes('DETAIL') || id.includes('DETAILS') || id.includes('DETAIL')) && !btn.dataset.katapultHandled) {
                btn.dataset.katapultHandled = 'true';
                detailsCount++;
                console.log(`[Katapult] ✓ Found DETAILS button #${detailsCount} in iframe:`, { text, ariaLabel, className, id });
                
                btn.addEventListener('click', (e: MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  console.log('[Katapult] DETAILS button clicked in iframe');
                  handleDetailsClick(e);
                  return false;
                }, true);
              }
            });
            
            if (buyCount > 0 || detailsCount > 0) {
              console.log(`[Katapult] ✓ Attached handlers in iframe: ${buyCount} BUY, ${detailsCount} DETAILS`);
            }
            
            // Set up mutation observer for iframe to catch dynamically added buttons
            if (!iframe.dataset.katapultObserved) {
              iframe.dataset.katapultObserved = 'true';
              const iframeObserver = new MutationObserver(() => {
                searchIframeButtons();
              });
              
              // Wait for body to be ready
              if (iframeDoc.body) {
                iframeObserver.observe(iframeDoc.body, {
                  childList: true,
                  subtree: true,
                });
              } else {
                // Wait for body to load
                iframeDoc.addEventListener('DOMContentLoaded', () => {
                  if (iframeDoc.body) {
                    iframeObserver.observe(iframeDoc.body, {
                      childList: true,
                      subtree: true,
                    });
                  }
                });
              }
            }
          }
        } catch (e) {
          console.log(`[Katapult] Cannot access iframe ${index} content:`, e);
        }
      });
    };
    
    // Try to access iframe content immediately and periodically
    searchIframeButtons();
    setTimeout(searchIframeButtons, 500);
    setTimeout(searchIframeButtons, 1000);
    setTimeout(searchIframeButtons, 2000);
    setTimeout(searchIframeButtons, 3000);
    setTimeout(searchIframeButtons, 5000);
    setTimeout(searchIframeButtons, 7000);
    setTimeout(searchIframeButtons, 10000);
    
    // Also try when iframe loads
    docIframes.forEach((iframe: any) => {
      iframe.addEventListener('load', () => {
        console.log('[Katapult] Iframe loaded event fired, searching for buttons...');
        setTimeout(searchIframeButtons, 100);
        setTimeout(searchIframeButtons, 500);
        setTimeout(searchIframeButtons, 1000);
      });
    });
    
    // Check if Autosync creates a shadow DOM or nested structure
    const allElements = container.querySelectorAll('*');
    console.log(`[Katapult] Container has ${allElements.length} total elements`);

    // Function to attach handlers to buttons
    const attachHandlers = () => {
      // Search in multiple places:
      // 1. Inside the container
      // 2. In the entire document (Autosync might render outside the container)
      // 3. In any iframes
      
      let allButtons: NodeListOf<Element> = container.querySelectorAll('button, a[role="button"], [onclick], [class*="button"], [class*="btn"], [id*="buy"], [id*="detail"], [data-action], [aria-label]');
      
      // Also search document-wide for buttons that might be outside the container
      const docButtons = document.querySelectorAll('button, a[role="button"], [onclick]');
      console.log(`[Katapult] Found ${docButtons.length} buttons in entire document`);
      
      // Combine results (avoid duplicates)
      const buttonSet = new Set<Element>();
      allButtons.forEach(btn => buttonSet.add(btn));
      docButtons.forEach(btn => {
        // Only add if it's not already in our container set
        if (!container.contains(btn)) {
          buttonSet.add(btn);
        }
      });
      
      allButtons = Array.from(buttonSet) as any;
      let buyCount = 0;
      let detailsCount = 0;
      
      console.log(`[Katapult] Scanning ${allButtons.length} potential buttons (container + document)...`);
      
      allButtons.forEach((btn: any, index: number) => {
        const text = (btn.textContent || btn.innerText || '').toUpperCase().trim();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toUpperCase();
        const className = (btn.className || '').toUpperCase();
        const id = (btn.id || '').toUpperCase();
        const dataAction = (btn.getAttribute('data-action') || '').toUpperCase();
        
        // Log first few buttons for debugging
        if (index < 5) {
          console.log(`[Katapult] Button ${index}: text="${text}", aria-label="${ariaLabel}", class="${className}", id="${id}"`);
        }
        
        // Handle BUY buttons - check multiple conditions
        const isBuyButton = (
          text === 'BUY' || 
          text.includes('BUY') ||
          ariaLabel.includes('BUY') ||
          className.includes('BUY') ||
          id.includes('BUY') ||
          dataAction.includes('BUY')
        );
        
        if (isBuyButton && !btn.dataset.katapultHandled) {
          btn.dataset.katapultHandled = 'true';
          buyCount++;
          console.log(`[Katapult] Found BUY button #${buyCount}:`, { text, ariaLabel, className, id });
          
          // Remove any existing click handlers first
          const newBtn = btn.cloneNode(true);
          btn.parentNode?.replaceChild(newBtn, btn);
          newBtn.dataset.katapultHandled = 'true';
          
          newBtn.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[Katapult] BUY button clicked via interceptor');
            handleBuyClick(e);
            return false;
          }, true); // Use capture phase to intercept early
        }
        
        // Handle DETAILS buttons - check multiple conditions
        const isDetailsButton = (
          text === 'DETAILS' || 
          text.includes('DETAILS') ||
          ariaLabel.includes('DETAILS') ||
          ariaLabel.includes('DETAIL') ||
          className.includes('DETAILS') ||
          className.includes('DETAIL') ||
          id.includes('DETAILS') ||
          id.includes('DETAIL') ||
          dataAction.includes('DETAILS') ||
          dataAction.includes('DETAIL')
        );
        
        if (isDetailsButton && !btn.dataset.katapultHandled) {
          btn.dataset.katapultHandled = 'true';
          detailsCount++;
          console.log(`[Katapult] Found DETAILS button #${detailsCount}:`, { text, ariaLabel, className, id });
          
          // Remove any existing click handlers first
          const newBtn = btn.cloneNode(true);
          btn.parentNode?.replaceChild(newBtn, btn);
          newBtn.dataset.katapultHandled = 'true';
          
          newBtn.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[Katapult] DETAILS button clicked via interceptor');
            handleDetailsClick(e);
            return false;
          }, true);
        }
      });
      
      if (buyCount > 0 || detailsCount > 0) {
        console.log(`[Katapult] ✓ Attached handlers: ${buyCount} BUY buttons, ${detailsCount} DETAILS buttons`);
      } else {
        console.log('[Katapult] ⚠ No BUY or DETAILS buttons found yet. The visualizer may still be loading.');
      }
    };

    // Use event delegation at document level to catch clicks
    // This will work even if buttons are in iframes (if same-origin) or shadow DOM
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const text = (target.textContent || target.innerText || '').toUpperCase().trim();
      const ariaLabel = (target.getAttribute('aria-label') || '').toUpperCase();
      const className = (target.className || '').toUpperCase();
      const id = (target.id || '').toUpperCase();
      const tagName = target.tagName?.toUpperCase();
      
      // Check if clicked element or its parent is a BUY button
      const isBuyButton = (
        (text === 'BUY' || text.includes('BUY')) ||
        ariaLabel.includes('BUY') ||
        className.includes('BUY') ||
        id.includes('BUY') ||
        (tagName === 'BUTTON' && text.includes('BUY'))
      );
      
      // Check if clicked element or its parent is a DETAILS button
      const isDetailsButton = (
        (text === 'DETAILS' || text.includes('DETAILS')) ||
        ariaLabel.includes('DETAILS') ||
        ariaLabel.includes('DETAIL') ||
        className.includes('DETAILS') ||
        className.includes('DETAIL') ||
        id.includes('DETAILS') ||
        id.includes('DETAIL') ||
        (tagName === 'BUTTON' && (text.includes('DETAILS') || text.includes('DETAIL')))
      );
      
      if (isBuyButton && !target.dataset.katapultHandled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[Katapult] BUY button clicked via document delegation:', { text, ariaLabel, className, id });
        handleBuyClick(e);
        return false;
      }
      
      if (isDetailsButton && !target.dataset.katapultHandled) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('[Katapult] DETAILS button clicked via document delegation:', { text, ariaLabel, className, id });
        handleDetailsClick(e);
        return false;
      }
    };
    
    // Add document-level click listener with capture phase
    document.addEventListener('click', handleDocumentClick, true);

    // Use MutationObserver to watch for dynamically added buttons
    // Watch both the container and the entire document
    const containerObserver = new MutationObserver(() => {
      attachHandlers();
    });

    const documentObserver = new MutationObserver(() => {
      attachHandlers();
    });

    containerObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    documentObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // Also check immediately and periodically with longer delays
    // Autosync buttons might load after the visualizer initializes
    attachHandlers();
    setTimeout(attachHandlers, 500);
    setTimeout(attachHandlers, 1000);
    setTimeout(attachHandlers, 2000);
    setTimeout(attachHandlers, 3000);
    setTimeout(attachHandlers, 5000);
    setTimeout(attachHandlers, 7000);
    setTimeout(attachHandlers, 10000);
  }, [handleBuyClick, handleDetailsClick]);

  // In case the script is already cached and available quickly:
  useEffect(() => {
    if (window.Autosync && !initialized.current) initAutosync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inject pre-approval button when visualizer becomes ready
  useEffect(() => {
    if (ready) {
      console.log('[Katapult] Visualizer ready, injecting pre-approval button...');
      const timer1 = setTimeout(() => {
        console.log('[Katapult] Injecting pre-approval button (1s delay)');
        try {
          injectPreApprovalButton();
        } catch (error) {
          console.error('[Katapult] Error injecting pre-approval button:', error);
        }
      }, 1000);
      
      return () => {
        clearTimeout(timer1);
      };
    }
  }, [ready, injectPreApprovalButton]);


  return (
    <main className="min-h-screen bg-katapult-dark-blue text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-katapult-dark-blue/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <div className="font-extrabold tracking-tight">Your Shop Name</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-sm font-bold text-katapult-pink">
                Katapult
              </div>
              <span className="text-xs font-semibold text-white/80">
                Lease-to-Own
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero with Katapult Benefits */}
      <section className="mx-auto max-w-6xl px-5 py-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold">
          See Your New Wheels — Then Lease-to-Own with{" "}
          <span className="text-katapult-pink">Katapult</span>
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Select your vehicle. Visualize. Checkout with flexible payment options.
        </p>
        
        {/* Compact Benefits Strip */}
        <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
            Instant decision
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
            No credit impact to check
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
            Flexible payments
          </div>
        </div>
      </section>

      {/* Visualizer - Star of the Page */}
      <section id="start" className="mx-auto max-w-6xl px-5 py-6">
        <div className="overflow-hidden rounded-2xl border-2 border-katapult-pink/20 bg-white/5 p-4 shadow-lg shadow-katapult-pink/10 relative">
          <div
            id={AUTOSYNC_CONTAINER_ID}
            className="min-h-[520px] w-full rounded-xl bg-black/10 relative"
          />
        </div>

        {/* Autosync Script */}
        <Script
          src="https://vvs.autosyncstudio.com/js/Autosync.js"
          strategy="afterInteractive"
          onLoad={initAutosync}
        />

        {!ready && (
          <div className="mt-3 text-center text-sm text-white/70">
            Loading visualizer…
          </div>
        )}
      </section>

      {/* How it works - Compact Horizontal Bar */}
      <section className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-katapult-pink/30 bg-katapult-pink/20 font-black text-katapult-pink mb-2">
              1
            </div>
            <div className="font-bold text-sm">Select Vehicle</div>
            <div className="mt-1 text-xs text-white/60">
              Quick lookup matches fitment
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-katapult-pink/30 bg-katapult-pink/20 font-black text-katapult-pink mb-2">
              2
            </div>
            <div className="font-bold text-sm">Visualize</div>
            <div className="mt-1 text-xs text-white/60">
              See the look before you decide
            </div>
          </div>
          <div className="text-center">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-katapult-pink/30 bg-katapult-pink/20 font-black text-katapult-pink mb-2">
              3
            </div>
            <div className="font-bold text-sm">Checkout</div>
            <div className="mt-1 text-xs text-white/60">
              Lease-to-Own with Katapult
            </div>
          </div>
        </div>
      </section>

      {/* Why Katapult */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <h2 className="text-xl font-black mb-6 text-center">Why Katapult?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="font-extrabold text-lg mb-2">Lease-to-Own built for real life</div>
            <div className="text-sm text-white/70">
              Options designed for high-ticket installs and real-world budgets.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="font-extrabold text-lg mb-2">Private & comfortable</div>
            <div className="text-sm text-white/70">
              Customers explore privately, then choose when ready.
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="font-extrabold text-lg mb-2">Built into checkout</div>
            <div className="text-sm text-white/70">
              Katapult branding stays visible during visualization + checkout.
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-6xl px-5 pb-10">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-xl font-black">Questions</h2>
          <span className="text-xs text-white/60">Quick answers</span>
        </div>

        <div className="space-y-3">
          <FAQ
            q="Does checking options affect my credit score?"
            a="Many customers can explore options without a traditional credit score impact to check eligibility. Final approval and terms depend on your application and provider rules."
          />
          <FAQ
            q="How fast is a decision?"
            a="Most customers receive a response in minutes after completing the steps inside the experience."
          />
          <FAQ
            q="Do I have to buy today?"
            a="No. Visualize first, review options, then move forward when you're ready."
          />
          <FAQ
            q="What if I'm not approved?"
            a="If Lease-to-Own isn't available, other payment options may be presented depending on the merchant's setup."
          />
          <FAQ
            q="Who provides Lease-to-Own?"
            a="Lease-to-Own options are brought to you by Katapult® where available."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-katapult-dark-blue/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-white/60 md:flex-row md:justify-between">
          <div>
            <div className="font-bold text-white/80">Your Shop Name</div>
            Address · Phone · Hours
          </div>
          <div className="max-w-xl">
            *Financing is subject to approval and terms. Lease-to-Own options
            provided by Katapult® where available. This page may include
            embedded partner tools to support visualization and checkout.
          </div>
        </div>
      </footer>


      {/* Payment Method Selection Modal */}
      {paymentSelectionOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setPaymentSelectionOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            
            <h2 className="text-2xl font-bold text-katapult-dark-blue mb-2">Choose Payment Method</h2>
            <p className="text-gray-600 mb-6 text-sm">Select how you&apos;d like to pay for your purchase</p>
            
            <div className="space-y-3">
              {/* LendPro Financing Option */}
              <button
                onClick={() => {
                  setPaymentMethod('financing');
                  launchFinancingWithSelection();
                }}
                className="w-full p-6 border-2 border-katapult-pink rounded-lg hover:bg-katapult-pink/5 transition-all text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-katapult-dark-blue mb-1">Lease-to-Own Financing</div>
                    <div className="text-sm text-gray-600">
                      Flexible payment options through LendPro. Instant decision, no credit impact to check.
                    </div>
                    <div className="mt-2 inline-block bg-katapult-pink text-white text-xs font-bold px-3 py-1 rounded-full">
                      RECOMMENDED
                    </div>
                  </div>
                </div>
              </button>
              
              {/* Credit Card Option */}
              <button
                onClick={() => {
                  setPaymentMethod('card');
                  launchFinancingWithSelection();
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-katapult-dark-blue mb-1">Credit Card</div>
                    <div className="text-sm text-gray-600">
                      Pay with your credit or debit card. Standard checkout process.
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LendPro Financing Lightbox - Mobile responsive */}
      {checkoutOpen && launchURL && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
          <div className="fixed inset-0 sm:inset-4 md:inset-8 lg:inset-16 bg-white rounded-none sm:rounded-lg shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-katapult-dark-blue">
              <h2 className="text-lg sm:text-xl font-bold text-white">LendPro Financing</h2>
              <button
                onClick={() => {
                  setCheckoutOpen(false);
                  setLaunchURL(null);
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>
            </div>
            
            {/* LendPro iframe - Mobile responsive */}
            <div className="flex-1 relative">
              <iframe
                src={launchURL}
                className="absolute inset-0 w-full h-full border-0"
                title="LendPro Financing Application"
                allow="payment"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Loading overlay during submission */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-katapult-pink border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-medium text-katapult-dark-blue">Launching financing...</p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Approval Modal */}
      <PreApprovalModal
        isOpen={preApprovalOpen}
        onClose={() => setPreApprovalOpen(false)}
        estimatedAmount={5000}
      />
    </main>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <summary className="cursor-pointer font-extrabold">{q}</summary>
      <p className="mt-3 text-sm text-white/70">{a}</p>
    </details>
  );
}
