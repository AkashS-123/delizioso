import { Link, Navigate } from "react-router-dom";
import { Footer, Navbar, h2, wrap } from "../components/site";
import { useCart } from "../context/CartContext";
import { money } from "../lib/storage";

export default function OrderSuccessPage() {
  const { order } = useCart();
  if (!order) return <Navigate to="/order-online" replace />;

  return (
    <div className="overflow-x-hidden bg-white font-sans text-cocoa transition-colors dark:bg-night dark:text-stone-100">
      <Navbar active="Order online" />
      <section className={`${wrap} max-w-[720px] pb-20 pt-6 md:pt-10`}>
        <div className="rounded-3xl bg-leaf px-6 py-10 text-center text-white">
          <h1 className="font-serif text-3xl font-bold sm:text-4xl">Thank you, your order is placed!</h1>
          <p className="mt-4 text-sm sm:text-base">Order ID : #{order.id}</p>
          <p className="mt-1 text-sm sm:text-base">A confirmation was sent to {order.customer.email}</p>
        </div>

        <h2 className={`${h2} mt-14 !text-3xl md:!text-4xl`}>Order details</h2>
        <ul className="mt-6 divide-y divide-stone-200 dark:divide-white/10">
          {order.lines.map((l) => (
            <li key={l.name} className="flex justify-between py-3"><span>{l.qty} × {l.name}</span><span className="text-brand">{money(l.qty * l.price)}</span></li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-stone-200 pt-4 dark:border-white/10">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Tax fee</dt><dd>{money(order.taxFee)}</dd></div>
          {order.discount > 0 && <div className="flex justify-between"><dt>Voucher</dt><dd>−{money(order.discount)}</dd></div>}
          <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd className="text-brand">{money(order.total)}</dd></div>
        </dl>

        <dl className="mt-10 grid gap-3 rounded-3xl bg-field p-6 text-sm dark:bg-field-dark sm:grid-cols-2">
          <div><dt className="text-stone-400">Name</dt><dd>{order.customer.name}</dd></div>
          <div><dt className="text-stone-400">Phone</dt><dd>{order.customer.phone}</dd></div>
          <div><dt className="text-stone-400">Method</dt><dd>{order.method} · {order.orderTime}</dd></div>
          <div><dt className="text-stone-400">Payment</dt><dd>{order.payment}</dd></div>
          {order.address && <div className="sm:col-span-2"><dt className="text-stone-400">Address</dt><dd>{order.address}</dd></div>}
          {order.customer.note && <div className="sm:col-span-2"><dt className="text-stone-400">Note</dt><dd>{order.customer.note}</dd></div>}
        </dl>

        <div className="mt-10 text-center">
          <Link to="/menu" className="inline-flex h-14 items-center rounded-full bg-brand px-10 font-medium text-white hover:bg-brand-dark">Back to menu</Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
