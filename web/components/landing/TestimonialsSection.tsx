const testimonials = [
  {
    body: "DITMail has transformed how we handle our business communications. The setup was seamless and the support team is incredible.",
    author: {
      name: "Sarah Chen",
      handle: "sarahchen",
      company: "TechStart Inc.",
      imageUrl: "/placeholder.svg?height=40&width=40",
    },
  },
  {
    body: "We switched from our previous provider and couldn't be happier. The security features and reliability are exactly what we needed.",
    author: {
      name: "Michael Rodriguez",
      handle: "mrodriguez",
      company: "Creative Agency",
      imageUrl: "/placeholder.svg?height=40&width=40",
    },
  },
  {
    body: "The custom domain setup was so easy, and having professional email addresses has really elevated our brand image.",
    author: {
      name: "Emily Johnson",
      handle: "emilyjohnson",
      company: "Johnson Consulting",
      imageUrl: "/placeholder.svg?height=40&width=40",
    },
  },
]

export function TestimonialsSection() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-lg font-semibold leading-8 tracking-tight text-blue-600">Testimonials</h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Trusted by businesses worldwide
          </p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="-mt-8 sm:-mx-4 sm:columns-2 sm:text-[0] lg:columns-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.author.handle} className="pt-8 sm:inline-block sm:w-full sm:px-4">
                <figure className="rounded-2xl bg-gray-50 p-8 text-sm leading-6">
                  <blockquote className="text-gray-900">
                    <p>"{testimonial.body}"</p>
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-x-4">
                    <img
                      className="h-10 w-10 rounded-full bg-gray-50"
                      src={testimonial.author.imageUrl || "/placeholder.svg"}
                      alt=""
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.author.name}</div>
                      <div className="text-gray-600">{testimonial.author.company}</div>
                    </div>
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
