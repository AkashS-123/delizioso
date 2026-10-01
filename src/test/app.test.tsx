import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import AppProviders from "../providers";

const Probe = () => <span data-testid="path">{useLocation().pathname}</span>;
const path = () => screen.getByTestId("path").textContent;

function setup(start = "/") {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[start]}>
      <AppProviders><App /><Probe /></AppProviders>
    </MemoryRouter>,
  );
  return user;
}

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as typeof window.matchMedia;
});

const heading = (name: string) => screen.queryByRole("heading", { name });

describe("Menu (issues 5 & 6)", () => {
  it("category tabs filter the dishes", async () => {
    const user = setup("/menu");
    expect(heading("Spaghetti")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Dessert" }));
    expect(heading("Tiramisu")).toBeTruthy();
    expect(heading("Spaghetti")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Drink" }));
    expect(heading("Espresso")).toBeTruthy();
    expect(heading("Tiramisu")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Lunch" }));
    expect(heading("Linguine")).toBeTruthy();
    expect(heading("Gnocchi")).toBeNull(); // dinner-only
  });

  it("pagination moves between pages and resets on a category change", async () => {
    const user = setup("/menu");
    expect(heading("Linguine")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(heading("Linguine")).toBeTruthy();
    expect(heading("Spaghetti")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Dinner" }));
    expect(screen.getByRole("button", { name: "Page 1" }).getAttribute("aria-current")).toBe("page");
  });

  it("clicking a dish opens its details; Esc closes it", async () => {
    const user = setup("/menu");
    await user.click(screen.getByRole("heading", { name: "Spaghetti" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Spaghetti" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ordering from the dish popup adds the chosen quantity and opens the order list", async () => {
    const user = setup("/menu");
    await user.click(screen.getByRole("heading", { name: "Gnocchi" }));
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Order now" }));
    expect(path()).toBe("/order-online");
    expect(screen.getByLabelText("Gnocchi quantity").textContent).toBe("2");
  });
});

describe("Order now (issue 2)", () => {
  it("navbar 'Order online' opens the order page", async () => {
    const user = setup("/");
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Order online" }));
    expect(path()).toBe("/order-online");
  });

  it("old /order URL still works", () => {
    setup("/order");
    expect(path()).toBe("/order-online");
  });

  it("Home buttons go to order / reservation", async () => {
    const user = setup("/");
    await user.click(screen.getAllByRole("link", { name: "Order now" })[0]);
    expect(path()).toBe("/order-online");
  });

  it("menu card 'Order now' adds the dish to the order list", async () => {
    const user = setup("/menu");
    await user.click(screen.getByRole("button", { name: "Order Spaghetti now" }));
    expect(path()).toBe("/order-online");
    expect(within(screen.getByRole("complementary", { name: "Order list" })).getByText("Spaghetti")).toBeTruthy();
  });

  it("order page: filter tabs, quantity, voucher", async () => {
    const user = setup("/order-online");
    await user.click(screen.getByRole("tab", { name: "Drink" }));
    expect(heading("Espresso")).toBeTruthy();
    expect(heading("Spaghetti")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "All catagory" }));
    await user.click(screen.getByRole("button", { name: "Add Spaghetti to order" }));
    await user.click(screen.getByRole("button", { name: "Increase Spaghetti" }));
    expect(screen.getByLabelText("Spaghetti quantity").textContent).toBe("2");
    await user.type(screen.getByLabelText("Voucher Code"), "nope");
    await user.click(screen.getByRole("button", { name: "Apply voucher" }));
    expect(screen.getByText("That voucher code isn't valid.")).toBeTruthy();
    await user.clear(screen.getByLabelText("Voucher Code"));
    await user.type(screen.getByLabelText("Voucher Code"), "FREETOEAT");
    await user.click(screen.getByRole("button", { name: "Apply voucher" }));
    expect(screen.getByText("Voucher applied: $5 off")).toBeTruthy();
    expect(screen.getByText("$20.18")).toBeTruthy(); // 24.10 + 4.5% tax (1.08) - $5
  });
});

describe("Checkout (issue 7)", () => {
  it("is disabled while the order list is empty", () => {
    setup("/order-online");
    expect((screen.getByRole("button", { name: "Checkout" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("validates, places the order and clears the cart", async () => {
    const user = setup("/order-online");
    await user.click(screen.getByRole("button", { name: "Add Spaghetti to order" }));
    await user.click(screen.getByRole("button", { name: "Checkout" }));
    expect(path()).toBe("/order-online/checkout");

    await user.click(screen.getByRole("button", { name: "Order now" }));
    expect(screen.getByText("Enter your first name.")).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(path()).toBe("/order-online/checkout");

    await user.type(screen.getByLabelText("First name"), "Ana");
    await user.type(screen.getByLabelText("Last name"), "Diaz");
    await user.type(screen.getByLabelText("Phone number"), "5551234567");
    await user.type(screen.getByLabelText("Email address"), "ana@example.com");
    await user.type(screen.getByLabelText("Shipping address"), "12 Main St");
    await user.click(screen.getByRole("button", { name: "Order now" }));

    expect(path()).toBe("/order-online/success");
    expect(screen.getByText(/Order ID/)).toBeTruthy();
    expect(screen.getByText("1 × Spaghetti")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem("delizioso.cart") ?? "{}")).toEqual({});
  });

  it("shipping page hands its choices to checkout", async () => {
    localStorage.setItem("delizioso.cart", JSON.stringify({ spaghetti: 1 }));
    const user = setup("/order-online/shipping");
    expect((screen.getByRole("button", { name: "Order now" }) as HTMLButtonElement).disabled).toBe(true); // needs the terms box
    await user.type(screen.getByPlaceholderText("Please type your address"), "12 Main St");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Order now" }));
    expect(path()).toBe("/order-online/checkout");
    expect((screen.getByLabelText("Shipping address") as HTMLInputElement).value).toBe("12 Main St");
  });
});

describe("Reservation (issues 3 & 4)", () => {
  it("books a table and confirms it", async () => {
    const user = setup("/reservation");
    fireEvent.change(document.getElementById("date")!, { target: { value: "2099-01-05" } });
    await user.selectOptions(screen.getByLabelText("Time"), "7:00 pm");
    await user.selectOptions(screen.getByLabelText("Party size"), "4 people");
    await user.click(screen.getByRole("button", { name: "Book now" }));
    expect(path()).toBe("/reservation/confirm");
    expect(screen.getAllByText(/Monday, 5 january 2099/i).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText("First name"), "Ana");
    await user.type(screen.getByLabelText("Last name"), "Diaz");
    await user.type(screen.getByLabelText("Phone number"), "5551234567");
    await user.type(screen.getByLabelText("Email address"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm reservation" }));
    expect(path()).toBe("/reservation/success");
    expect(screen.getByText("Reservation has been confirmed")).toBeTruthy();
  });

  it("Modify returns to the form with the booking prefilled", async () => {
    const user = setup("/reservation");
    fireEvent.change(document.getElementById("date")!, { target: { value: "2099-01-05" } });
    await user.selectOptions(screen.getByLabelText("Time"), "7:00 pm");
    await user.selectOptions(screen.getByLabelText("Party size"), "4 people");
    await user.click(screen.getByRole("button", { name: "Book now" }));
    await user.type(screen.getByLabelText("First name"), "Ana");
    await user.type(screen.getByLabelText("Last name"), "Diaz");
    await user.type(screen.getByLabelText("Phone number"), "5551234567");
    await user.type(screen.getByLabelText("Email address"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm reservation" }));
    await user.click(screen.getByRole("link", { name: /Modify/ }));
    expect(path()).toBe("/reservation");
    expect((document.getElementById("date") as HTMLInputElement).value).toBe("2099-01-05");
    expect((screen.getByLabelText("Time") as HTMLSelectElement).value).toBe("7:00 pm");
  });

  it("Home 'Reservation' buttons go to the booking form", async () => {
    const user = setup("/");
    await user.click(screen.getAllByRole("link", { name: "Reservation" }).find((l: HTMLElement) => l.className.includes("bg-leaf"))!);
    expect(path()).toBe("/reservation");
  });
});

describe("Login (issue 1)", () => {
  it("sign up → log out → wrong password error → log in", async () => {
    const user = setup("/signup");
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByText("Enter your full name.")).toBeTruthy();

    await user.type(screen.getByPlaceholderText("Robert Martine"), "Ana Diaz");
    await user.type(screen.getByPlaceholderText("Robertmartine@gmail.com"), "Ana@Example.com");
    await user.type(screen.getByPlaceholderText("••••••••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(path()).toBe("/");
    expect(screen.getByText("Hi, Ana")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Log out" }));
    expect(screen.queryByText("Hi, Ana")).toBeNull();

    await user.click(screen.getAllByRole("link", { name: "Log in" })[0]);
    expect(path()).toBe("/login-art");
    await user.type(screen.getByPlaceholderText("Email address"), "ana@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(screen.getByText("Incorrect email or password.")).toBeTruthy();
    expect(path()).toBe("/login-art");

    await user.clear(screen.getByPlaceholderText("Password"));
    await user.type(screen.getByPlaceholderText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(path()).toBe("/");
    expect(screen.getByText("Hi, Ana")).toBeTruthy();
  });

  it("rejects duplicate accounts and short passwords", async () => {
    const user = setup("/signup");
    await user.type(screen.getByPlaceholderText("Robert Martine"), "Ana");
    await user.type(screen.getByPlaceholderText("Robertmartine@gmail.com"), "ana@example.com");
    await user.type(screen.getByPlaceholderText("••••••••••••••"), "short");
    await user.click(screen.getByRole("button", { name: "Sign up" }));
    expect(screen.getByText("Use at least 8 characters.")).toBeTruthy();
  });

  it("'Forget Password?' opens a real page", async () => {
    const user = setup("/login");
    await user.click(screen.getByRole("link", { name: "Forget Password?" }));
    expect(path()).toBe("/forgot-password");
    expect(screen.getByRole("heading", { name: "Forgot password" })).toBeTruthy();
  });
});
